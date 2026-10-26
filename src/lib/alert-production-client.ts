/**
 * A1.8 — Production opt-in pilot client, dark-launched (disabled by default).
 * Every remote operation requires BOTH the exact approved Production backend
 * hostname and an explicit build-time feature flag set to "true".
 * No schema migration is performed by this client, and it never generates
 * or sends alerts. RLS/column privileges must enforce account isolation.
 * Never expose service-role keys in browser bundles.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_IN_APP_ALERT_PREFERENCES,
  type InAppAlertPreferences,
} from "@/lib/opportunity-alerts";
import type { OpportunityCategory } from "@/lib/opportunities";
import type { InboxNotification } from "@/components/alerts/NotificationCenterPanel";

const PRODUCTION_BACKEND_HOST = "c--433a53c8-8872-49f2-b7b8-3e8dc7e96e35-prod.lovable.cloud";
const ALLOWED_CATEGORIES = new Set<OpportunityCategory>([
  "scholarship",
  "job",
  "internship",
  "grant",
]);
const ALLOWED_DAYS = new Set([1, 3, 7]);

export function isProductionAlertPilotEnabled(): boolean {
  try {
    // Evaluated in the browser at build time by Vite; no secret involved.
    return (
      import.meta.env["VITE_A18_PRODUCTION_ALERTS_ENABLED"] === "true" &&
      new URL(import.meta.env["VITE_SUPABASE_URL"] ?? "").hostname === PRODUCTION_BACKEND_HOST
    );
  } catch {
    return false;
  }
}

function guardBackend() {
  if (!isProductionAlertPilotEnabled()) {
    throw new Error("In-app alerts are not enabled on this Production build. No data was changed.");
  }
}

type PreferenceRow = {
  user_id: string;
  enabled: boolean;
  new_matches_enabled: boolean;
  saved_deadlines_enabled: boolean;
  categories: OpportunityCategory[];
  minimum_match_score: number;
  deadline_lead_days: number[];
  timezone: string;
  updated_at: string;
};
type NotificationRow = {
  id: string;
  user_id: string;
  opportunity_id: string;
  kind: "new_match" | "saved_deadline";
  event_key: string;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
};
type AlertTables = {
  alert_preferences: {
    Row: PreferenceRow;
    Insert: {
      user_id: string;
      enabled?: boolean;
      new_matches_enabled?: boolean;
      saved_deadlines_enabled?: boolean;
      categories?: OpportunityCategory[];
      minimum_match_score?: number;
      deadline_lead_days?: number[];
      timezone?: string;
      updated_at?: string;
    };
    Update: {
      enabled?: boolean;
      new_matches_enabled?: boolean;
      saved_deadlines_enabled?: boolean;
      categories?: OpportunityCategory[];
      minimum_match_score?: number;
      deadline_lead_days?: number[];
      timezone?: string;
    };
    Relationships: [];
  };
  user_notifications: {
    Row: NotificationRow;
    Insert: never; // Client never creates a notification.
    Update: { read_at?: string | null; dismissed_at?: string | null };
    Relationships: [];
  };
};
type AlertDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & AlertTables;
  };
};
/** Typed schema extension without editing Lovable-generated integration files. */
const client = supabase as unknown as SupabaseClient<AlertDatabase>;

async function getAuthenticatedUserId(): Promise<string> {
  guardBackend();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in again before accessing alert settings.");
  return data.user.id;
}

export function validateDraftAlertPreferences(input: InAppAlertPreferences): void {
  if (
    !Number.isInteger(input.minimumMatchScore) ||
    input.minimumMatchScore < 0 ||
    input.minimumMatchScore > 100
  ) {
    throw new Error("Match score must be a whole number between 0 and 100.");
  }
  if (
    new Set(input.categories).size !== input.categories.length ||
    input.categories.some((item) => !ALLOWED_CATEGORIES.has(item))
  ) {
    throw new Error("Select valid, non-duplicate opportunity categories.");
  }
  if (
    input.deadlineLeadDays.length < 1 ||
    new Set(input.deadlineLeadDays).size !== input.deadlineLeadDays.length ||
    input.deadlineLeadDays.some((day) => !ALLOWED_DAYS.has(day))
  ) {
    throw new Error("Select at least one of 1, 3 or 7 reminder days.");
  }
  if (
    typeof input.enabled !== "boolean" ||
    typeof input.newMatchesEnabled !== "boolean" ||
    typeof input.savedDeadlineRemindersEnabled !== "boolean"
  ) {
    throw new Error("Invalid alert preference.");
  }
}

function toPreferences(row: PreferenceRow | null): InAppAlertPreferences {
  if (!row) {
    return {
      ...DEFAULT_IN_APP_ALERT_PREFERENCES,
      categories: [],
      deadlineLeadDays: [...DEFAULT_IN_APP_ALERT_PREFERENCES.deadlineLeadDays],
    };
  }
  return {
    enabled: row.enabled,
    newMatchesEnabled: row.new_matches_enabled,
    savedDeadlineRemindersEnabled: row.saved_deadlines_enabled,
    categories: row.categories ?? [],
    minimumMatchScore: row.minimum_match_score,
    deadlineLeadDays: row.deadline_lead_days ?? [1, 3, 7],
  };
}

const PREFERENCE_COLUMNS =
  "user_id,enabled,new_matches_enabled,saved_deadlines_enabled,categories,minimum_match_score,deadline_lead_days,timezone,updated_at";

export async function fetchMyAlertPreferences(): Promise<InAppAlertPreferences> {
  const userId = await getAuthenticatedUserId();
  const { data, error } = await client
    .from("alert_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return toPreferences(data as PreferenceRow | null);
}

/**
 * Explicit Save only; no autosave on edit.
 * Authenticated id comes from getUser, never passed in by the component.
 * Database owner RLS and column privileges provide independent enforcement.
 */
export async function saveMyAlertPreferences(
  input: InAppAlertPreferences,
): Promise<InAppAlertPreferences> {
  guardBackend();
  validateDraftAlertPreferences(input);
  const userId = await getAuthenticatedUserId();
  const values = {
    enabled: input.enabled,
    new_matches_enabled: input.newMatchesEnabled,
    saved_deadlines_enabled: input.savedDeadlineRemindersEnabled,
    categories: [...input.categories],
    minimum_match_score: input.minimumMatchScore,
    deadline_lead_days: [...input.deadlineLeadDays],
  };
  const { data: existing, error: fetchError } = await client
    .from("alert_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (existing) {
    const { error } = await client.from("alert_preferences").update(values).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await client.from("alert_preferences").insert({ user_id: userId, ...values });
    if (error) {
      // If two signed-in devices attempted the first insert simultaneously,
      // a unique-key race is recoverable by owner-only UPDATE.
      if (error.code !== "23505") throw error;
      const { error: retryError } = await client
        .from("alert_preferences")
        .update(values)
        .eq("user_id", userId);
      if (retryError) throw retryError;
    }
  }
  const readBack = await fetchMyAlertPreferences();
  // Security: never pretend enabled consent was persisted if the server says otherwise.
  if (readBack.enabled !== input.enabled) {
    throw new Error("The server did not confirm your alert choice.");
  }
  return readBack;
}

type PublicOpportunity = {
  id: string;
  title: string;
  status: Database["public"]["Enums"]["opportunity_status"];
  verified_status: Database["public"]["Enums"]["verified_status"];
  reviewed_at: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  deadline: string | null;
};

function currentlyPublic(item: PublicOpportunity, now = new Date()): boolean {
  const currentDate = now.toISOString().slice(0, 10);
  return (
    item.status === "active" &&
    item.verified_status === "verified" &&
    !!item.reviewed_at &&
    !!item.reviewed_by &&
    !!item.published_at &&
    Date.parse(item.published_at) <= now.getTime() &&
    (!item.deadline || item.deadline >= currentDate)
  );
}

/** Only explicitly allowed notification columns; never SELECT * or event_key. */
export async function fetchMyAlertNotifications(): Promise<InboxNotification[]> {
  await getAuthenticatedUserId();
  const { data, error } = await client
    .from("user_notifications")
    .select("id,opportunity_id,kind,created_at,read_at,dismissed_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const notifications = data ?? [];
  const ids = [...new Set(notifications.map((item) => item.opportunity_id))];
  if (ids.length === 0) return [];

  // Extra application-level publication check, including for admin sessions.
  // Database notification RLS already independently rejects private references.
  const { data: currentOpportunities, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,title,status,verified_status,reviewed_at,reviewed_by,published_at,deadline")
    .in("id", ids)
    .eq("status", "active")
    .eq("verified_status", "verified");
  if (opportunityError) throw opportunityError;

  const publicById = new Map(
    (currentOpportunities ?? [])
      .filter((op) => currentlyPublic(op))
      .map((op) => [op.id, { id: op.id, title: op.title }]),
  );
  return notifications.map((item) => ({
    id: item.id,
    kind: item.kind,
    createdAt: item.created_at,
    readAt: item.read_at,
    dismissedAt: item.dismissed_at,
    visibleOpportunity: publicById.get(item.opportunity_id) ?? null,
  }));
}

export async function updateMyAlertNotification(
  id: string,
  action: "read" | "dismiss",
): Promise<void> {
  await getAuthenticatedUserId();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid notification ID.");
  }
  const column = action === "read" ? "read_at" : "dismissed_at";
  const payload =
    action === "read"
      ? { read_at: new Date().toISOString() }
      : { dismissed_at: new Date().toISOString() };
  const { data, error } = await client
    .from("user_notifications")
    .update(payload)
    .eq("id", id)
    .is(column, null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Notification is no longer available to update.");
}
