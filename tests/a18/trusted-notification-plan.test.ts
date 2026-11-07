import { describe, expect, it } from "bun:test";
import {
  planTrustedInAppNotificationInserts,
  type TrustedAlertPlanInput,
} from "../../src/lib/a18-trusted-notification-plan";
import {
  DEFAULT_IN_APP_ALERT_PREFERENCES,
  type InAppAlertPreferences,
} from "../../src/lib/opportunity-alerts";
import type { Opportunity } from "../../src/lib/opportunities";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const PUBLIC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DRAFT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const NOW = new Date("2026-10-26T00:30:00.000Z");

const optIn: InAppAlertPreferences = {
  ...DEFAULT_IN_APP_ALERT_PREFERENCES,
  enabled: true,
  savedDeadlineRemindersEnabled: true,
  newMatchesEnabled: false,
  categories: ["scholarship"],
  deadlineLeadDays: [1, 3, 7],
};

function opportunity(patch: Partial<Opportunity> = {}): Opportunity {
  return {
    id: PUBLIC,
    category: "scholarship",
    title: "Confirmed scholarship",
    description: "Software engineering studies",
    organization: "Test institution",
    country: "Nigeria",
    state: "Kaduna",
    status: "active",
    verified_status: "verified",
    reviewed_at: "2026-10-24T12:00:00Z",
    reviewed_by: A,
    published_at: "2026-10-25T12:00:00Z",
    deadline: "2026-10-29",
    eligibility: "undergraduate",
    benefits: "Funding",
    created_at: "2026-10-24T12:00:00Z",
    updated_at: "2026-10-25T12:00:00Z",
    ...patch,
  } as Opportunity;
}

function input(patch: Partial<TrustedAlertPlanInput> = {}): TrustedAlertPlanInput {
  return {
    userId: A,
    timezone: "Etc/UTC",
    preferences: optIn,
    profile: null,
    opportunities: [opportunity()],
    savedOpportunities: [{ userId: A, opportunityId: PUBLIC }],
    storedNotificationKeys: [],
    now: NOW,
    ...patch,
  };
}

describe("A1.8 trusted-worker notification plan (offline, NEVER inserts)", () => {
  it("never plans notifications for default-OFF or revoked consent", () => {
    expect(
      planTrustedInAppNotificationInserts(
        input({ preferences: DEFAULT_IN_APP_ALERT_PREFERENCES }),
      ),
    ).toEqual([]);
    expect(
      planTrustedInAppNotificationInserts(input({
        preferences: { ...optIn, enabled: false },
      })),
    ).toEqual([]);
  });

  it("plans only published, reviewed, unexpired, saved opportunities", () => {
    const rows = [
      opportunity(),
      opportunity({ id: DRAFT, status: "draft", reviewed_at: null }),
      opportunity({ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", deadline: "2026-10-20" }),
      opportunity({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", published_at: "2026-11-01T00:00:00Z" }),
    ];
    const found = planTrustedInAppNotificationInserts(input({
      opportunities: rows,
      savedOpportunities: rows.map((r) => ({ userId: A, opportunityId: r.id })),
    }));
    expect(found).toEqual([{
      user_id: A,
      opportunity_id: PUBLIC,
      kind: "saved_deadline",
      event_key: `saved_deadline:${PUBLIC}:2026-10-29:3`,
    }]);
  });

  it("keeps rows tenant-keyed, with stable keys for idempotent future insert", () => {
    const a = planTrustedInAppNotificationInserts(input({
      savedOpportunities: [{ userId: A, opportunityId: PUBLIC }, { userId: A, opportunityId: PUBLIC }],
      opportunities: [opportunity(), opportunity()],
    }));
    const b = planTrustedInAppNotificationInserts(input({
      userId: B,
      savedOpportunities: [{ userId: B, opportunityId: PUBLIC }],
    }));
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0]?.user_id).toBe(A);
    expect(b[0]?.user_id).toBe(B);
    expect(a[0]?.event_key).toBe(b[0]?.event_key);
    expect(a[0]?.opportunity_id).toBe(PUBLIC);
  });

  it("uses trusted IANA timezone instead of machine date near midnight", () => {
    const utc = planTrustedInAppNotificationInserts(input({
      preferences: { ...optIn, deadlineLeadDays: [3] },
    }));
    const la = planTrustedInAppNotificationInserts(input({
      timezone: "America/Los_Angeles",
      preferences: { ...optIn, deadlineLeadDays: [3] },
    }));
    expect(utc).toHaveLength(1); // 26 Oct UTC: three days to deadline.
    expect(la).toEqual([]); // 25 Oct in Los Angeles: four days remain.
  });

  it("fails closed for unsupported timezone, malformed account and clock", () => {
    expect(() => planTrustedInAppNotificationInserts(input({
      timezone: "Not/A_Real_Zone",
    }))).toThrow("Unsupported IANA timezone");
    expect(() => planTrustedInAppNotificationInserts(input({
      timezone: "UTC",
    }))).toThrow("Invalid notification timezone shape");
    expect(() => planTrustedInAppNotificationInserts(input({
      userId: "not-a-real-user",
    }))).toThrow("Invalid alert account ID");
    expect(() => planTrustedInAppNotificationInserts(input({
      now: new Date("invalid"),
    }))).toThrow("Invalid trusted alert clock");
  });

  it("fails closed for invalid or duplicated preferences, not fake opt-in", () => {
    const invalid: InAppAlertPreferences[] = [
      { ...optIn, deadlineLeadDays: [2] },
      { ...optIn, deadlineLeadDays: [1, 1] },
      { ...optIn, minimumMatchScore: 102 },
      { ...optIn, categories: ["job", "job"] },
      { ...optIn, enabled: "true" as unknown as boolean },
    ];
    for (const preferences of invalid) {
      expect(() => planTrustedInAppNotificationInserts(input({ preferences }))).toThrow(
        "Invalid account alert preferences",
      );
    }
  });

  it("rejects cross-account saved-record inputs instead of planning leaked alerts", () => {
    expect(() => planTrustedInAppNotificationInserts(input({
      savedOpportunities: [{ userId: B, opportunityId: PUBLIC }],
    }))).toThrow("Cross-account or invalid saved opportunity metadata");

    expect(() => planTrustedInAppNotificationInserts(input({
      savedOpportunities: [{ userId: A, opportunityId: "invalid-id" }],
    }))).toThrow("Cross-account or invalid saved opportunity metadata");
  });

  it("rejects a profile belonging to another user before generating matches", () => {
    expect(() => planTrustedInAppNotificationInserts(input({
      profile: { id: B } as TrustedAlertPlanInput["profile"],
    }))).toThrow("Cross-account alert profile mismatch");
  });

  it("does not starve the 51st candidate when the first 50 were already stored", () => {
    const rows = Array.from({ length: 51 }, (_, index) => opportunity({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${(index + 1).toString(16).padStart(12, "0")}`,
    }));
    const first = planTrustedInAppNotificationInserts(input({
      opportunities: rows,
      savedOpportunities: rows.map((row) => ({ userId: A, opportunityId: row.id })),
    }));
    expect(first).toHaveLength(50);

    const next = planTrustedInAppNotificationInserts(input({
      opportunities: rows,
      savedOpportunities: rows.map((row) => ({ userId: A, opportunityId: row.id })),
      storedNotificationKeys: first.map((row) => ({ userId: A, eventKey: row.event_key })),
    }));
    expect(next).toHaveLength(1);
    expect(first.some((row) => row.opportunity_id === next[0]?.opportunity_id)).toBe(false);

    const none = planTrustedInAppNotificationInserts(input({
      opportunities: rows,
      savedOpportunities: rows.map((row) => ({ userId: A, opportunityId: row.id })),
      storedNotificationKeys: [...first, ...next].map((row) => ({
        userId: A,
        eventKey: row.event_key,
      })),
    }));
    expect(none).toEqual([]);
  });

  it("refuses stored notification keys assigned to a different user", () => {
    expect(() => planTrustedInAppNotificationInserts(input({
      storedNotificationKeys: [{ userId: B, eventKey: "saved_deadline:test" }],
    }))).toThrow("Cross-account or invalid stored notification metadata");

    expect(() => planTrustedInAppNotificationInserts(input({
      storedNotificationKeys: [{ userId: A, eventKey: "" }],
    }))).toThrow("Cross-account or invalid stored notification metadata");
  });

  it("never reads DB, schedules jobs or sends messages", () => {
    // Planner inputs are plain in-memory values and return proposed metadata.
    // No credentials or network mocks are used; its caller still needs a
    // separately reviewed, authenticated, trusted DB runner and live RLS tests.
    expect(planTrustedInAppNotificationInserts(input({ savedOpportunities: [] }))).toEqual([]);
  });
});
