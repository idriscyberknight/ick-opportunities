import { isProfileReadyForMatching, rankOpportunities } from "./matching";
import type { Opportunity, OpportunityCategory } from "./opportunities";
import type { ProfileData } from "./profile";

/**
 * A1.8 planning-only alert candidate engine.
 * Does NOT schedule jobs, send messages, read/write database rows or store consent.
 * An eventual trusted delivery process must validate RLS-visible/published data,
 * user consent, idempotency, and notification retention again before insertion.
 */
export type InAppAlertPreferences = {
  enabled: boolean;
  newMatchesEnabled: boolean;
  savedDeadlineRemindersEnabled: boolean;
  categories: readonly OpportunityCategory[];
  minimumMatchScore: number;
  deadlineLeadDays: readonly number[];
};

export type OpportunityAlertCandidate = {
  kind: "new_match" | "saved_deadline";
  opportunityId: string;
  eventKey: string;
  score: number | null;
  daysUntilDeadline: number | null;
  reason: string;
};

export const DEFAULT_IN_APP_ALERT_PREFERENCES: Readonly<InAppAlertPreferences> = {
  enabled: false, // Strict user opt-in: never activate alerts as a side-effect of onboarding.
  newMatchesEnabled: true,
  savedDeadlineRemindersEnabled: true,
  categories: [],
  minimumMatchScore: 40,
  deadlineLeadDays: [1, 3, 7],
};

const DAY_MS = 86_400_000;
const MAX_PUBLICATION_AGE_DAYS = 14;
const MAX_RESULTS = 50;

function dateToDayNumber(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  const utc = Date.UTC(year, month - 1, day);
  const check = new Date(utc);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(utc / DAY_MS);
}

/**
 * `todayLocalDate` must be a YYYY-MM-DD date computed using the user's
 * validated IANA timezone by a trusted caller; do not derive it using the
 * server or browser machine's timezone in production.
 */
export function buildInAppAlertCandidates(input: {
  opportunities: readonly Opportunity[];
  profile: ProfileData | null;
  preferences: InAppAlertPreferences;
  savedOpportunityIds: ReadonlySet<string>;
  nowIso: string;
  todayLocalDate: string;
}): OpportunityAlertCandidate[] {
  const { opportunities, profile, preferences, savedOpportunityIds, nowIso, todayLocalDate } =
    input;
  if (!preferences.enabled) return [];

  const nowMs = Date.parse(nowIso);
  const todayNumber = dateToDayNumber(todayLocalDate);
  if (!Number.isFinite(nowMs) || todayNumber === null) return [];

  const allowed = opportunities.filter((item) => {
    if (item.status !== "active" || item.verified_status !== "verified") return false;
    if (!item.reviewed_at || !item.reviewed_by || !item.published_at) return false;

    const publishedMs = Date.parse(item.published_at);
    if (!Number.isFinite(publishedMs) || publishedMs > nowMs) return false;

    if (item.deadline !== null) {
      const deadlineDay = dateToDayNumber(item.deadline);
      if (deadlineDay === null || deadlineDay < todayNumber) return false;
    }
    return true;
  });
  const alerts: OpportunityAlertCandidate[] = [];
  const keys = new Set<string>();

  if (
    preferences.newMatchesEnabled &&
    preferences.categories.length > 0 &&
    profile &&
    isProfileReadyForMatching(profile) &&
    Number.isInteger(preferences.minimumMatchScore) &&
    preferences.minimumMatchScore >= 0 &&
    preferences.minimumMatchScore <= 100
  ) {
    const minimum = preferences.minimumMatchScore;
    const filtered = allowed.filter((item) => preferences.categories.includes(item.category));
    // Reuse the EXISTING recommendation model and explicitly pass today's date.
    for (const ranked of rankOpportunities(filtered, profile, minimum, todayLocalDate)) {
      const item = ranked.opportunity;
      const publishedMs = Date.parse(item.published_at!);
      if (nowMs - publishedMs > MAX_PUBLICATION_AGE_DAYS * DAY_MS) continue;

      const eventKey = `new_match:${item.id}:${item.published_at}`;
      if (keys.has(eventKey)) continue;
      keys.add(eventKey);
      alerts.push({
        kind: "new_match",
        opportunityId: item.id,
        eventKey,
        score: ranked.score,
        daysUntilDeadline: null,
        reason: ranked.reasons[0] ?? "Matches selected opportunity preferences",
      });
    }
  }

  if (preferences.savedDeadlineRemindersEnabled) {
    const days = Array.from(
      new Set(preferences.deadlineLeadDays.filter((x) => Number.isInteger(x) && x >= 1 && x <= 30)),
    ).sort((a, b) => a - b);

    for (const item of allowed) {
      if (!savedOpportunityIds.has(item.id) || !item.deadline) continue;
      const remaining = dateToDayNumber(item.deadline)! - todayNumber;
      const lead = days.find((threshold) => remaining <= threshold);
      if (lead === undefined) continue;

      const eventKey = `saved_deadline:${item.id}:${item.deadline}:${lead}`;
      if (keys.has(eventKey)) continue;
      keys.add(eventKey);
      alerts.push({
        kind: "saved_deadline",
        opportunityId: item.id,
        eventKey,
        score: null,
        daysUntilDeadline: remaining,
        reason:
          remaining === 0
            ? "Saved opportunity closes today"
            : `Saved opportunity closes in ${remaining} day(s)`,
      });
    }
  }

  // Deterministic capped ordering. Later persistence MUST enforce
  // UNIQUE(user_id, event_key) atomically; this per-call Set is not sufficient.
  return alerts
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "saved_deadline" ? -1 : 1;
      if (a.kind === "saved_deadline") {
        const diff = (a.daysUntilDeadline ?? 0) - (b.daysUntilDeadline ?? 0);
        if (diff !== 0) return diff;
      } else {
        const diff = (b.score ?? 0) - (a.score ?? 0);
        if (diff !== 0) return diff;
      }
      return a.eventKey.localeCompare(b.eventKey);
    })
    .slice(0, MAX_RESULTS);
}
