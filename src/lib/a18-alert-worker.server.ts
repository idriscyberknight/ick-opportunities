/**
 * A1.8 trusted in-app notification worker (server-only).
 * Called only by the cron-authenticated scheduled route with the service-role
 * client. Never import from browser code.
 *
 * Safety model:
 *  - opt-in only; users paged deterministically by user_id (keyset cursor), so
 *    nobody is permanently skipped by a per-run cap;
 *  - opportunities paged by id; only fully published rows (active, verified,
 *    reviewed_by/at, published_at <= now, deadline not passed);
 *  - immediately before insert, the user's LATEST preference row and the
 *    LATEST publication state of every planned opportunity are re-read and the
 *    plan is recomputed from that fresh state (categories, score, toggles,
 *    reminder days all honoured; withdrawn consent => nothing inserted);
 *  - inserts use UNIQUE(user_id,event_key) + ON CONFLICT DO NOTHING, so retries
 *    and overlapping runs never duplicate.
 *  - Residual: PostgREST calls are separate statements, so a change committed in
 *    the milliseconds between the re-read and the insert is not seen. The guarded
 *    single-statement insert in design/a18/a18_guarded_insert_REVIEW_ONLY.sql
 *    closes that window once approved.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  planTrustedInAppNotificationInserts,
  type ProposedNotificationInsert,
} from "./a18-trusted-notification-plan";
import type { Opportunity, OpportunityCategory } from "./opportunities";
import type { ProfileData } from "./profile";

export const WORKER_LIMITS = {
  userPageSize: 200,
  maxUsersPerRun: 2000,
  opportunityPageSize: 500,
  maxOpportunities: 5000,
  storedKeyPageSize: 1000,
  maxInsertsPerUser: 20,
} as const;

export type AlertPrefRow = {
  user_id: string;
  enabled: boolean;
  new_matches_enabled: boolean;
  saved_deadlines_enabled: boolean;
  categories: string[];
  minimum_match_score: number;
  deadline_lead_days: number[];
  timezone: string;
};

/** Data-access seam: production uses Supabase; tests use an in-memory store. */
export interface AlertWorkerStore {
  listEnabledPrefs(afterUserId: string | null, limit: number): Promise<AlertPrefRow[]>;
  listPublishedOpportunities(
    afterId: string | null,
    limit: number,
    nowIso: string,
    today: string,
  ): Promise<Opportunity[]>;
  getPref(userId: string): Promise<AlertPrefRow | null>;
  getProfile(userId: string): Promise<ProfileData | null>;
  listSavedIds(userId: string): Promise<string[]>;
  listStoredKeys(userId: string, afterKey: string | null, limit: number): Promise<string[]>;
  /** Re-read: only ids that are fully published right now. */
  filterPublished(ids: string[], nowIso: string, today: string): Promise<Opportunity[]>;
  /** Must be ON CONFLICT (user_id,event_key) DO NOTHING; returns rows actually inserted. */
  insertIgnoringDuplicates(rows: ProposedNotificationInsert[]): Promise<number>;
}

export type AlertWorkerResult = {
  usersConsidered: number;
  inserted: number;
  failures: number;
  skippedConsentChanged: number;
  truncatedUsers: boolean;
  truncatedOpportunities: boolean;
  /** Present when more opted-in users remain after this bounded batch. */
  nextUserCursor: string | null;
};

function plan(
  pref: AlertPrefRow,
  profile: ProfileData | null,
  opportunities: Opportunity[],
  savedIds: string[],
  storedKeys: string[],
  now: Date,
) {
  return planTrustedInAppNotificationInserts({
    userId: pref.user_id,
    timezone: pref.timezone,
    preferences: {
      enabled: pref.enabled,
      newMatchesEnabled: pref.new_matches_enabled,
      savedDeadlineRemindersEnabled: pref.saved_deadlines_enabled,
      categories: pref.categories as OpportunityCategory[],
      minimumMatchScore: pref.minimum_match_score,
      deadlineLeadDays: pref.deadline_lead_days,
    },
    profile,
    opportunities,
    savedOpportunities: savedIds.map((opportunityId) => ({ userId: pref.user_id, opportunityId })),
    storedNotificationKeys: storedKeys.map((eventKey) => ({ userId: pref.user_id, eventKey })),
    now,
  });
}

async function loadAllStoredKeys(store: AlertWorkerStore, userId: string) {
  const keys: string[] = [];
  let after: string | null = null;
  for (;;) {
    const page = await store.listStoredKeys(userId, after, WORKER_LIMITS.storedKeyPageSize);
    keys.push(...page);
    if (page.length < WORKER_LIMITS.storedKeyPageSize) return keys;
    after = page[page.length - 1] ?? null;
  }
}

export async function processUser(
  store: AlertWorkerStore,
  pref: AlertPrefRow,
  opportunities: Opportunity[],
  now: Date,
): Promise<{ inserted: number; consentChanged: boolean }> {
  const userId = pref.user_id;
  const [profile, savedIds, storedKeys] = await Promise.all([
    store.getProfile(userId),
    store.listSavedIds(userId),
    loadAllStoredKeys(store, userId),
  ]);
  const first = plan(pref, profile, opportunities, savedIds, storedKeys, now);
  if (!first.length) return { inserted: 0, consentChanged: false };

  // Fresh re-read of consent + publication immediately before persistence.
  const nowIso = now.toISOString();
  const earliestLocalDate = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  const latest = await store.getPref(userId);
  if (!latest || latest.user_id !== userId || !latest.enabled) {
    return { inserted: 0, consentChanged: true };
  }
  const ids = Array.from(new Set(first.map((r) => r.opportunity_id)));
  const live = await store.filterPublished(ids, nowIso, earliestLocalDate);
  // Recompute from fresh state; keep only rows present in both plans.
  const firstKeys = new Set(first.map((r) => r.event_key));
  const rows = plan(latest, profile, live, savedIds, storedKeys, now)
    .filter((r) => firstKeys.has(r.event_key) && r.user_id === userId)
    .slice(0, WORKER_LIMITS.maxInsertsPerUser);
  const consentChanged = rows.length < Math.min(first.length, WORKER_LIMITS.maxInsertsPerUser);
  if (!rows.length) return { inserted: 0, consentChanged };
  return { inserted: await store.insertIgnoringDuplicates(rows), consentChanged };
}

/**
 * Resume an authorized scheduler batch with `afterUserId` from the previous
 * result. Never silently start again at user zero while more users remain.
 */
export async function runAlertWorkerWithStore(
  store: AlertWorkerStore,
  now = new Date(),
  afterUserId: string | null = null,
): Promise<AlertWorkerResult> {
  const result: AlertWorkerResult = {
    usersConsidered: 0,
    inserted: 0,
    failures: 0,
    skippedConsentChanged: 0,
    truncatedUsers: false,
    truncatedOpportunities: false,
    nextUserCursor: null,
  };
  const nowIso = now.toISOString();
  // Include yesterday in the initial SQL candidate window: at UTC midnight,
  // users west of UTC can still legitimately have the previous local date.
  // The trusted planner and guarded RPC enforce exact user-local deadlines.
  const earliestLocalDate = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

  // Load published opportunities with keyset pagination.
  const opportunities: Opportunity[] = [];
  let oppCursor: string | null = null;
  for (;;) {
    const page = await store.listPublishedOpportunities(
      oppCursor,
      WORKER_LIMITS.opportunityPageSize,
      nowIso,
      earliestLocalDate,
    );
    opportunities.push(...page);
    if (page.length < WORKER_LIMITS.opportunityPageSize) break;
    if (opportunities.length >= WORKER_LIMITS.maxOpportunities) {
      result.truncatedOpportunities = true;
      break;
    }
    oppCursor = page[page.length - 1]?.id ?? null;
  }

  let userCursor: string | null = afterUserId;
  for (;;) {
    const page = await store.listEnabledPrefs(userCursor, WORKER_LIMITS.userPageSize);
    for (const pref of page) {
      result.usersConsidered++;
      try {
        const r = await processUser(store, pref, opportunities, now);
        result.inserted += r.inserted;
        if (r.consentChanged) result.skippedConsentChanged++;
      } catch (e) {
        result.failures++;
        // No user ids or opportunity details in logs.
        console.error("[a18-worker] account processing failed:", (e as Error).message);
      }
    }
    if (page.length < WORKER_LIMITS.userPageSize) break;
    if (result.usersConsidered >= WORKER_LIMITS.maxUsersPerRun) {
      // Expose a real resume cursor; repeated scheduled calls MUST supply it.
      // Without a cursor, the initial 2,000 users would be processed forever.
      const remaining = await store.listEnabledPrefs(
        page[page.length - 1]?.user_id ?? null,
        1,
      );
      if (remaining.length > 0) {
        result.truncatedUsers = true;
        result.nextUserCursor = page[page.length - 1]?.user_id ?? null;
      }
      break;
    }
    userCursor = page[page.length - 1]?.user_id ?? null;
  }
  return result;
}

// ---------------- Supabase adapter ----------------

type Admin = SupabaseClient<Database>;

const PUBLISHED = (q: any, nowIso: string, today: string) =>
  q
    .eq("status", "active")
    .eq("verified_status", "verified")
    .not("reviewed_by", "is", null)
    .not("reviewed_at", "is", null)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .or(`deadline.is.null,deadline.gte.${today}`);

export function supabaseAlertStore(db: Admin): AlertWorkerStore {
  return {
    async listEnabledPrefs(after, limit) {
      let q = db.from("alert_preferences").select("*").eq("enabled", true).order("user_id");
      if (after) q = q.gt("user_id", after);
      const { data, error } = await q.limit(limit);
      if (error) throw new Error("preference load failed");
      return (data ?? []) as AlertPrefRow[];
    },
    async listPublishedOpportunities(after, limit, nowIso, today) {
      let q = PUBLISHED(db.from("opportunities").select("*"), nowIso, today).order("id");
      if (after) q = q.gt("id", after);
      const { data, error } = await q.limit(limit);
      if (error) throw new Error("opportunity load failed");
      return (data ?? []) as Opportunity[];
    },
    async getPref(userId) {
      const { data, error } = await db
        .from("alert_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error("consent recheck failed");
      return (data as AlertPrefRow | null) ?? null;
    },
    async getProfile(userId) {
      const [p, prefs, skills, interests] = await Promise.all([
        db.from("profiles").select("*").eq("id", userId).maybeSingle(),
        db.from("user_opportunity_preferences").select("opportunity_type").eq("user_id", userId),
        db.from("user_skills").select("skills(name)").eq("user_id", userId),
        db.from("user_interests").select("interest").eq("user_id", userId),
      ]);
      if (p.error || prefs.error || skills.error || interests.error) {
        throw new Error("alert matching profile load failed");
      }
      if (!p.data) return null;
      const r = p.data;
      return {
        id: r.id,
        full_name: r.full_name,
        education_level: r.education_level,
        field_of_study: r.field_of_study,
        career_field: r.career_field,
        experience_level: r.experience_level,
        country: r.country,
        state: r.state,
        city: r.city,
        remote_preference: r.remote_preference,
        onboarding_completed: r.onboarding_completed,
        opportunityTypes: (prefs.data ?? []).map((x) => x.opportunity_type),
        skills: (skills.data ?? [])
          .map((x) => (x.skills as { name: string } | null)?.name)
          .filter((n): n is string => !!n),
        interests: (interests.data ?? []).map((x) => x.interest),
      };
    },
    async listSavedIds(userId) {
      // PostgREST may cap one response at 1,000 rows. Use a stable keyset
      // cursor so saved-deadline reminders aren't silently dropped.
      const ids: string[] = [];
      let afterId: string | null = null;
      for (;;) {
        let q = db
          .from("saved_opportunities")
          .select("opportunity_id")
          .eq("user_id", userId)
          .order("opportunity_id");
        if (afterId) q = q.gt("opportunity_id", afterId);
        const { data, error } = await q.limit(WORKER_LIMITS.storedKeyPageSize);
        if (error) throw new Error("saved load failed");
        const page = (data ?? []).map((s) => s.opportunity_id);
        ids.push(...page);
        if (page.length < WORKER_LIMITS.storedKeyPageSize) return ids;
        afterId = page[page.length - 1] ?? null;
      }
    },
    async listStoredKeys(userId, after, limit) {
      let q = db
        .from("user_notifications")
        .select("event_key")
        .eq("user_id", userId)
        .order("event_key");
      if (after) q = q.gt("event_key", after);
      const { data, error } = await q.limit(limit);
      if (error) throw new Error("stored key load failed");
      return (data ?? []).map((s) => s.event_key);
    },
            async filterPublished(ids, nowIso, today) {
      if (!ids.length) return [];
      const { data, error } = await PUBLISHED(
        db.from("opportunities").select("*").in("id", ids),
        nowIso,
        today,
      );
      if (error) throw new Error("publication recheck failed");
      return (data ?? []) as Opportunity[];
    },
    async insertIgnoringDuplicates(rows) {
      if (!rows.length) return 0;
      const payload = rows.map((r) => {
        let lead_days: number | null = null;
        if (r.kind === "saved_deadline") {
          const parts = r.event_key.split(":");
          const parsed = parseInt(parts[parts.length - 1] ?? "", 10);
          if (!Number.isNaN(parsed)) lead_days = parsed;
        }
        return {
          user_id: r.user_id,
          opportunity_id: r.opportunity_id,
          kind: r.kind,
          event_key: r.event_key,
          lead_days,
        };
      });

      // Fail closed: only the database's atomic consent/publication guarded RPC
      // may persist notifications. A direct table upsert would bypass its
      // insert-time checks if this function is unavailable or fails.
      const { data, error } = await db.rpc("a18_insert_notifications_guarded", {
        _rows: payload as unknown as Json,
      });
      if (error) throw new Error("guarded notification insert failed");
      if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 0 || data > rows.length) {
        throw new Error("guarded notification insert returned invalid count");
      }
      return data;
    },
  };
}

/** Accept only UUID cursors from the authenticated scheduler's prior result. */
export function parseAlertWorkerCursor(raw: string | null): string | null {
  if (raw === null) return null;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(raw)) {
    throw new Error("invalid alert worker continuation cursor");
  }
  return raw.toLowerCase();
}

export function runAlertWorker(
  db: Admin,
  now = new Date(),
  afterUserId: string | null = null,
) {
  return runAlertWorkerWithStore(supabaseAlertStore(db), now, afterUserId);
}
