import { describe, expect, it } from "bun:test";
import {
  runAlertWorkerWithStore,
  WORKER_LIMITS,
  type AlertPrefRow,
  type AlertWorkerStore,
} from "../../src/lib/a18-alert-worker.server";
import type { ProposedNotificationInsert } from "../../src/lib/a18-trusted-notification-plan";
import type { Opportunity } from "../../src/lib/opportunities";
import { authenticateCronRequest } from "../../src/integrations/supabase/cron-auth";

// Isolated in-memory data only. No Production records are touched.
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const OPP = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOW = new Date("2026-10-26T00:30:00.000Z");

function opp(patch: Partial<Opportunity> = {}): Opportunity {
  return {
    id: OPP,
    category: "scholarship",
    title: "Confirmed scholarship",
    description: "x",
    organization: "Test institution",
    country: "Nigeria",
    status: "active",
    verified_status: "verified",
    reviewed_at: "2026-10-24T12:00:00Z",
    reviewed_by: A,
    published_at: "2026-10-25T12:00:00Z",
    deadline: "2026-10-29",
    created_at: "2026-10-24T12:00:00Z",
    updated_at: "2026-10-25T12:00:00Z",
    ...patch,
  } as Opportunity;
}

function pref(userId: string, patch: Partial<AlertPrefRow> = {}): AlertPrefRow {
  return {
    user_id: userId,
    enabled: true,
    new_matches_enabled: false,
    saved_deadlines_enabled: true,
    categories: ["scholarship"],
    minimum_match_score: 60,
    deadline_lead_days: [1, 3, 7],
    timezone: "Etc/UTC",
    ...patch,
  };
}

function isPublished(o: Opportunity, nowIso: string, today: string) {
  return (
    o.status === "active" &&
    o.verified_status === "verified" &&
    !!o.reviewed_by &&
    !!o.reviewed_at &&
    !!o.published_at &&
    o.published_at <= nowIso &&
    (!o.deadline || o.deadline >= today)
  );
}

class MemStore implements AlertWorkerStore {
  prefs = new Map<string, AlertPrefRow>();
  opps = new Map<string, Opportunity>();
  saved = new Map<string, string[]>();
  notifications: ProposedNotificationInsert[] = [];
  beforeRecheck?: (userId: string) => void;
  prefPageCalls = 0;

  async listEnabledPrefs(after: string | null, limit: number) {
    this.prefPageCalls++;
    return [...this.prefs.values()]
      .filter((p) => p.enabled && (!after || p.user_id > after))
      .sort((a, b) => a.user_id.localeCompare(b.user_id))
      .slice(0, limit);
  }
  async listPublishedOpportunities(after: string | null, limit: number, n: string, t: string) {
    return [...this.opps.values()]
      .filter((o) => isPublished(o, n, t) && (!after || o.id > after))
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, limit);
  }
  async getPref(userId: string) {
    this.beforeRecheck?.(userId);
    return this.prefs.get(userId) ?? null;
  }
  async getProfile() {
    return null;
  }
  async listSavedIds(userId: string) {
    return this.saved.get(userId) ?? [];
  }
  async listStoredKeys(userId: string, after: string | null, limit: number) {
    return this.notifications
      .filter((n) => n.user_id === userId && (!after || n.event_key > after))
      .map((n) => n.event_key)
      .sort()
      .slice(0, limit);
  }
  async filterPublished(ids: string[], n: string, t: string) {
    return ids.map((id) => this.opps.get(id)).filter((o): o is Opportunity => !!o && isPublished(o, n, t));
  }
  async insertIgnoringDuplicates(rows: ProposedNotificationInsert[]) {
    let c = 0;
    for (const r of rows) {
      if (this.notifications.some((n) => n.user_id === r.user_id && n.event_key === r.event_key)) continue;
      this.notifications.push(r);
      c++;
    }
    return c;
  }
}

function baseStore() {
  const s = new MemStore();
  s.prefs.set(A, pref(A));
  s.opps.set(OPP, opp());
  s.saved.set(A, [OPP]);
  return s;
}

describe("A1.8 worker persistence safety (isolated in-memory data)", () => {
  it("baseline: opted-in user with saved published opportunity gets one reminder", async () => {
    const s = baseStore();
    const r = await runAlertWorkerWithStore(s, NOW);
    expect(r.inserted).toBe(1);
    expect(s.notifications[0]).toMatchObject({ user_id: A, opportunity_id: OPP, kind: "saved_deadline" });
  });

  it("consent withdrawn during generation => nothing inserted", async () => {
    const s = baseStore();
    s.beforeRecheck = (u) => s.prefs.set(u, pref(u, { enabled: false }));
    const r = await runAlertWorkerWithStore(s, NOW);
    expect(r.inserted).toBe(0);
    expect(r.skippedConsentChanged).toBe(1);
    expect(s.notifications).toEqual([]);
  });

  it("reminder toggle turned off during generation => nothing inserted", async () => {
    const s = baseStore();
    s.beforeRecheck = (u) => s.prefs.set(u, pref(u, { saved_deadlines_enabled: false }));
    expect((await runAlertWorkerWithStore(s, NOW)).inserted).toBe(0);
  });

  it("category removed during generation => nothing inserted", async () => {
    const s = baseStore();
    s.beforeRecheck = (u) => s.prefs.set(u, pref(u, { categories: ["job"] }));
    expect((await runAlertWorkerWithStore(s, NOW)).inserted).toBe(0);
  });

  it("reminder interval removed during generation => nothing inserted", async () => {
    const s = baseStore();
    s.beforeRecheck = (u) => s.prefs.set(u, pref(u, { deadline_lead_days: [1] }));
    expect((await runAlertWorkerWithStore(s, NOW)).inserted).toBe(0);
  });

  for (const [label, patch] of [
    ["withdrawn (status draft)", { status: "draft" }],
    ["rejected verification", { verified_status: "rejected" }],
    ["review cleared", { reviewed_by: null }],
    ["unpublished", { published_at: null }],
    ["future-published", { published_at: "2026-12-01T00:00:00Z" }],
  ] as const) {
    it(`opportunity ${label} before insert => nothing inserted`, async () => {
      const s = baseStore();
      s.beforeRecheck = () => s.opps.set(OPP, opp(patch as Partial<Opportunity>));
      expect((await runAlertWorkerWithStore(s, NOW)).inserted).toBe(0);
    });
  }

  it("expired opportunities never generate notifications", async () => {
    const s = baseStore();
    s.opps.set(OPP, opp({ deadline: "2026-10-25" }));
    expect((await runAlertWorkerWithStore(s, NOW)).inserted).toBe(0);
  });

  it("re-running does not duplicate", async () => {
    const s = baseStore();
    await runAlertWorkerWithStore(s, NOW);
    const r2 = await runAlertWorkerWithStore(s, NOW);
    expect(r2.inserted).toBe(0);
    expect(s.notifications.length).toBe(1);
  });

  it("concurrent worker executions create exactly one row", async () => {
    const s = baseStore();
    const [r1, r2] = await Promise.all([
      runAlertWorkerWithStore(s, NOW),
      runAlertWorkerWithStore(s, NOW),
    ]);
    expect(r1.inserted + r2.inserted).toBe(1);
    expect(s.notifications.length).toBe(1);
  });

  it("User A / User B isolation: B's saved item never alerts A and vice versa", async () => {
    const s = baseStore();
    s.saved.set(A, []);
    s.prefs.set(B, pref(B));
    s.saved.set(B, [OPP]);
    await runAlertWorkerWithStore(s, NOW);
    expect(s.notifications.map((n) => n.user_id)).toEqual([B]);
  });

  it("paginates all enabled users beyond one page (none skipped)", async () => {
    const s = new MemStore();
    s.opps.set(OPP, opp());
    const total = WORKER_LIMITS.userPageSize + 5;
    for (let i = 0; i < total; i++) {
      const id = `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
      s.prefs.set(id, pref(id));
      s.saved.set(id, [OPP]);
    }
    const r = await runAlertWorkerWithStore(s, NOW);
    expect(r.usersConsidered).toBe(total);
    expect(r.inserted).toBe(total);
    expect(s.prefPageCalls).toBe(2);
  });

  it("one failing account does not stop others", async () => {
    const s = baseStore();
    s.prefs.set(B, pref(B));
    s.saved.set(B, [OPP]);
    const orig = s.listSavedIds.bind(s);
    s.listSavedIds = async (u: string) => {
      if (u === A) throw new Error("boom");
      return orig(u);
    };
    const r = await runAlertWorkerWithStore(s, NOW);
    expect(r.failures).toBe(1);
    expect(r.inserted).toBe(1);
  });
});

describe("A1.8 scheduler authentication", () => {
  process.env.LOVABLE_CRON_SECRET = "test-only-secret";
  const req = (h?: string) =>
    new Request("http://x/api/public/jobs/alerts", {
      method: "POST",
      headers: h ? { authorization: h } : {},
    });

  it("rejects missing credentials", async () => {
    expect((await authenticateCronRequest(req()))?.status).toBe(401);
  });
  it("rejects wrong credentials", async () => {
    expect((await authenticateCronRequest(req("Bearer wrong")))?.status).toBe(401);
  });
  it("rejects a browser-style session token", async () => {
    expect((await authenticateCronRequest(req("Bearer eyJhbGciOi.fake.jwt")))?.status).toBe(401);
  });
  it("accepts the scheduler secret", async () => {
    expect(await authenticateCronRequest(req("Bearer test-only-secret"))).toBeNull();
  });
});
