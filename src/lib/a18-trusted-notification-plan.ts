/**
 * A1.8 — trusted-runtime notification INSERT *planning* only.
 *
 * This file does not import a Supabase client, read a database, authenticate
 * requests, persist rows, schedule jobs, or deliver messages. Never invoke it
 * from a browser or interpret its output as authorization to INSERT.
 *
 * A future server-only runner MUST load each account's opt-in preferences,
 * owner-scoped saved IDs, and the current PUBLIC, reviewed opportunities from
 * the authoritative backend. Immediately before any INSERT it MUST recheck
 * consent, publication, unique (user_id,event_key), rate limits, and the
 * actual row owner in a single trusted transaction. No service-role token
 * should ever be exposed to frontend code.
 */
import { buildInAppAlertCandidates, type InAppAlertPreferences } from "./opportunity-alerts";
import type { Opportunity, OpportunityCategory } from "./opportunities";
import type { ProfileData } from "./profile";

const USER_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMEZONE_SHAPE = /^[A-Za-z][A-Za-z0-9_+.-]*\/[A-Za-z][A-Za-z0-9_+./-]*$/;
const VALID_CATEGORIES = new Set<OpportunityCategory>([
  "scholarship",
  "job",
  "internship",
  "grant",
]);
const VALID_REMINDER_DAYS = new Set([1, 3, 7]);

export type ProposedNotificationInsert = Readonly<{
  user_id: string;
  opportunity_id: string;
  kind: "new_match" | "saved_deadline";
  event_key: string;
}>;

export type TrustedAlertPlanInput = Readonly<{
  /** Obtained from auth.users by a trusted per-account backend job. */
  userId: string;
  /** Timezone belongs to the same user's validated preferences row. */
  timezone: string;
  preferences: InAppAlertPreferences;
  profile: ProfileData | null;
  /** Already restricted to published, reviewed public candidates. */
  opportunities: readonly Opportunity[];
  /** Must be queried with user_id = this account's id, not global saved IDs. */
  savedOpportunityIds: readonly string[];
  /** Trusted job clock; never user supplied. */
  now: Date;
}>;

function localDateForTimezone(now: Date, zone: string): string {
  if (!TIMEZONE_SHAPE.test(zone) || zone.length < 3 || zone.length > 64) {
    throw new Error("Invalid notification timezone shape");
  }

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    throw new Error("Unsupported IANA timezone for notification planning");
  }

  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) throw new Error("Unable to determine local date");
  return `${year.padStart(4, "0")}-${month}-${day}`;
}

function isSafePreferences(input: InAppAlertPreferences): boolean {
  const categories = input.categories;
  const days = input.deadlineLeadDays;
  return (
    typeof input.enabled === "boolean" &&
    typeof input.newMatchesEnabled === "boolean" &&
    typeof input.savedDeadlineRemindersEnabled === "boolean" &&
    Array.isArray(categories) &&
    categories.length <= 4 &&
    new Set(categories).size === categories.length &&
    categories.every((category) => VALID_CATEGORIES.has(category)) &&
    Number.isInteger(input.minimumMatchScore) &&
    input.minimumMatchScore >= 0 &&
    input.minimumMatchScore <= 100 &&
    Array.isArray(days) &&
    days.length >= 1 &&
    days.length <= 3 &&
    new Set(days).size === days.length &&
    days.every((day) => VALID_REMINDER_DAYS.has(day))
  );
}

/**
 * Produces bounded, deterministic proposed INSERT rows, but writes NOTHING.
 * Incorrect/incomplete per-account inputs abort or return zero suggestions.
 * The future runner must enforce privileged rechecks and transaction policy.
 */
export function planTrustedInAppNotificationInserts(
  input: TrustedAlertPlanInput,
): ProposedNotificationInsert[] {
  if (!USER_ID_SHAPE.test(input.userId)) throw new Error("Invalid alert account ID");
  if (!(input.now instanceof Date) || !Number.isFinite(input.now.getTime())) {
    throw new Error("Invalid trusted alert clock");
  }

  // A default-OFF or opted-out account can never yield notification INSERTs.
  if (!input.preferences.enabled) return [];
  if (!isSafePreferences(input.preferences)) {
    throw new Error("Invalid account alert preferences; failing closed");
  }

  const todayLocalDate = localDateForTimezone(input.now, input.timezone);
  const candidates = buildInAppAlertCandidates({
    opportunities: input.opportunities,
    profile: input.profile,
    preferences: input.preferences,
    savedOpportunityIds: new Set(input.savedOpportunityIds),
    nowIso: input.now.toISOString(),
    todayLocalDate,
  });

  return candidates.map((candidate) => {
    if (candidate.eventKey.length < 1 || candidate.eventKey.length > 180) {
      throw new Error("Notification event key exceeds database constraint");
    }
    return {
      user_id: input.userId,
      opportunity_id: candidate.opportunityId,
      kind: candidate.kind,
      event_key: candidate.eventKey,
    };
  });
}
