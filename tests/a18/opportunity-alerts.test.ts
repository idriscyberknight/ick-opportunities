import { describe, expect, it } from "bun:test";
import {
  buildInAppAlertCandidates,
  DEFAULT_IN_APP_ALERT_PREFERENCES,
  type InAppAlertPreferences,
} from "../../src/lib/opportunity-alerts";
import type { Opportunity } from "../../src/lib/opportunities";
import type { ProfileData } from "../../src/lib/profile";
import { rankOpportunities } from "../../src/lib/matching";

const NOW = "2026-10-26T10:00:00.000Z";
const TODAY = "2026-10-26";
const profile: ProfileData = {
  id: "user-a",
  full_name: null,
  education_level: "undergraduate",
  field_of_study: "Computer Science",
  career_field: "Software",
  experience_level: "entry",
  country: "Nigeria",
  state: "Kaduna",
  city: null,
  remote_preference: "any",
  onboarding_completed: true,
  opportunityTypes: ["scholarships"],
  skills: ["Software"],
  interests: ["Technology"],
};

const optedIn: InAppAlertPreferences = {
  enabled: true,
  newMatchesEnabled: true,
  savedDeadlineRemindersEnabled: true,
  categories: ["scholarship"],
  minimumMatchScore: 20,
  deadlineLeadDays: [1, 3, 7],
};

function opportunity(patch: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-a",
    category: "scholarship",
    title: "Technology scholarship for Nigerian software students",
    description: "Undergraduate computer science opportunity",
    organization: "University",
    country: "Nigeria",
    state: "Kaduna",
    status: "active",
    verified_status: "verified",
    reviewed_at: "2026-10-24T12:00:00Z",
    reviewed_by: "editor",
    published_at: "2026-10-25T12:00:00Z",
    deadline: "2026-10-29",
    eligibility: "undergraduate in technology",
    benefits: "Funding",
    created_at: "2026-10-20T12:00:00Z",
    updated_at: "2026-10-25T12:00:00Z",
    ...patch,
  } as Opportunity;
}

function derive(
  rows: Opportunity[],
  props: {
    preferences?: InAppAlertPreferences;
    saved?: readonly string[];
    nowIso?: string;
    todayLocalDate?: string;
    userProfile?: ProfileData | null;
  } = {},
) {
  return buildInAppAlertCandidates({
    opportunities: rows,
    profile: props.userProfile === undefined ? profile : props.userProfile,
    preferences: props.preferences ?? optedIn,
    savedOpportunityIds: new Set(props.saved ?? []),
    nowIso: props.nowIso ?? NOW,
    todayLocalDate: props.todayLocalDate ?? TODAY,
  });
}

describe("A1.8 passive in-app alert proposal", () => {
  it("is opt-in OFF by default even when a good opportunity is saved", () => {
    expect(DEFAULT_IN_APP_ALERT_PREFERENCES.enabled).toBe(false);
    expect(derive([opportunity()], { preferences: DEFAULT_IN_APP_ALERT_PREFERENCES, saved: ["opp-a"] })).toEqual([]);
  });

  it("defense-in-depth: excludes unpublished, unreviewed, future published and expired rows", () => {
    const variants: Partial<Opportunity>[] = [
      { id: "draft", status: "draft" },
      { id: "unverified", verified_status: "pending_review" },
      { id: "no-publisher", reviewed_by: null },
      { id: "no-review-time", reviewed_at: null },
      { id: "no-published-date", published_at: null },
      { id: "future", published_at: "2026-10-27T00:00:00Z" },
      { id: "expired", deadline: "2026-10-25" },
      { id: "invalid-deadline", deadline: "2026-02-30" },
    ];
    for (const variant of variants) {
      const row = opportunity(variant);
      expect(derive([row], { saved: [row.id] })).toEqual([]);
    }
  });

  it("reuses existing explainable ranking for only recent published categories", () => {
    const rows = [
      opportunity(),
      opportunity({ id: "grant", category: "grant" }),
      opportunity({ id: "old", published_at: "2026-10-01T00:00:00Z" }),
    ];
    const results = derive(rows);
    expect(results).toHaveLength(1);
    expect(results[0]?.kind).toBe("new_match");
    expect(results[0]?.opportunityId).toBe("opp-a");
    expect(results[0]?.score).toBeGreaterThanOrEqual(20);
    expect(results[0]?.reason.length).toBeGreaterThan(8);
  });

  it("does not send new-match alerts for incomplete profiles or empty category opt-in", () => {
    const row = opportunity();
    expect(derive([row], { userProfile: null })).toEqual([]);
    expect(
      derive([row], { preferences: { ...optedIn, categories: [] } }),
    ).toEqual([]);
    expect(derive([row], { preferences: { ...optedIn, minimumMatchScore: 101 } })).toEqual([]);
  });

  it("allows saved deadline reminders without a complete profile, but only if opted in", () => {
    const result = derive([opportunity()], { userProfile: null, saved: ["opp-a"] });
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("saved_deadline");
    expect(result[0]?.daysUntilDeadline).toBe(3);
    expect(result[0]?.eventKey).toBe("saved_deadline:opp-a:2026-10-29:3");
    expect(derive([opportunity()], { userProfile: null })).toEqual([]);
    expect(derive([opportunity()], {
      userProfile: null,
      saved: ["opp-a"],
      preferences: { ...optedIn, savedDeadlineRemindersEnabled: false },
    })).toEqual([]);
  });

  it("uses stable milestone keys and catches up within a window without daily duplicates", () => {
    const row = opportunity();
    const early = derive([row], { userProfile: null, saved: ["opp-a"], todayLocalDate: "2026-10-26" });
    const later = derive([row], { userProfile: null, saved: ["opp-a"], todayLocalDate: "2026-10-27" });
    expect(early[0]?.eventKey).toBe(later[0]?.eventKey);
    expect(early[0]?.eventKey).toBe("saved_deadline:opp-a:2026-10-29:3");
    const last = derive([row], { userProfile: null, saved: ["opp-a"], todayLocalDate: "2026-10-28" });
    expect(last[0]?.eventKey).toBe("saved_deadline:opp-a:2026-10-29:1");
    expect(derive([row, row], { userProfile: null, saved: ["opp-a"] })).toHaveLength(1);
  });

  it("fails closed for invalid caller clock/date and future-published opportunities", () => {
    expect(derive([opportunity()], { todayLocalDate: "2026-02-30" })).toEqual([]);
    expect(derive([opportunity()], { nowIso: "bad-date" })).toEqual([]);
    expect(derive([opportunity({ published_at: "2026-10-27T12:00:00Z" })])).toEqual([]);
  });

  it("preserves backwards compatibility of existing recommendation ranking", () => {
    const row = opportunity();
    expect(rankOpportunities([row], profile, 20, TODAY).length).toBe(1);
    expect(rankOpportunities([row], profile, 20, "2026-10-30").length).toBe(0);
  });
});
