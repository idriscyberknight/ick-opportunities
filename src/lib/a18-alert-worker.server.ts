/**
 * A1.8 trusted in-app notification worker (server-only).
 * Called only by the authenticated scheduled route. Uses the service-role client
 * after the caller is verified. Never import from browser code.
 *
 * Safety: opt-in only; only active+verified+reviewed+published opportunities;
 * owner-scoped saved rows; consent + publication re-checked right before insert;
 * atomic dedup via UNIQUE(user_id,event_key) + ON CONFLICT DO NOTHING, so retries
 * and overlapping runs never create duplicates.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { planTrustedInAppNotificationInserts } from "./a18-trusted-notification-plan";
import type { Opportunity, OpportunityCategory } from "./opportunities";
import type { ProfileData } from "./profile";

const MAX_USERS_PER_RUN = 500;
const MAX_INSERTS_PER_USER = 20;

export type AlertWorkerResult = {
  usersConsidered: number;
  inserted: number;
  failures: number;
};

type Admin = SupabaseClient<Database>;

async function loadPublicOpportunities(db: Admin): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await db
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .eq("verified_status", "verified")
    .not("reviewed_by", "is", null)
    .not("reviewed_at", "is", null)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .or(`deadline.is.null,deadline.gte.${today}`)
    .limit(1000);
  if (error) throw new Error("opportunity load failed");
  return data ?? [];
}

async function loadProfile(db: Admin, userId: string): Promise<ProfileData | null> {
  const [p, prefs, skills, interests] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("user_opportunity_preferences").select("opportunity_type").eq("user_id", userId),
    db.from("user_skills").select("skills(name)").eq("user_id", userId),
    db.from("user_interests").select("interest").eq("user_id", userId),
  ]);
  if (p.error || !p.data) return null;
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
}

export async function runAlertWorker(db: Admin, now = new Date()): Promise<AlertWorkerResult> {
  const result: AlertWorkerResult = { usersConsidered: 0, inserted: 0, failures: 0 };

  const { data: prefRows, error } = await db
    .from("alert_preferences")
    .select("*")
    .eq("enabled", true)
    .limit(MAX_USERS_PER_RUN);
  if (error) throw new Error("preference load failed");
  if (!prefRows?.length) return result;

  const opportunities = await loadPublicOpportunities(db);

  for (const pref of prefRows) {
    result.usersConsidered++;
    try {
      const userId = pref.user_id;
      const [profile, saved, stored] = await Promise.all([
        loadProfile(db, userId),
        db.from("saved_opportunities").select("opportunity_id").eq("user_id", userId),
        db.from("user_notifications").select("event_key").eq("user_id", userId).limit(5000),
      ]);
      if (saved.error || stored.error) throw new Error("owner data load failed");

      const plan = planTrustedInAppNotificationInserts({
        userId,
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
        savedOpportunities: (saved.data ?? []).map((s) => ({
          userId,
          opportunityId: s.opportunity_id,
        })),
        storedNotificationKeys: (stored.data ?? []).map((s) => ({ userId, eventKey: s.event_key })),
        now,
      }).slice(0, MAX_INSERTS_PER_USER);
      if (!plan.length) continue;

      // Revalidate consent immediately before persistence.
      const recheck = await db
        .from("alert_preferences")
        .select("enabled")
        .eq("user_id", userId)
        .maybeSingle();
      if (!recheck.data?.enabled) continue;

      // Revalidate publication immediately before persistence.
      const ids = Array.from(new Set(plan.map((p) => p.opportunity_id)));
      const live = await db
        .from("opportunities")
        .select("id")
        .in("id", ids)
        .eq("status", "active")
        .eq("verified_status", "verified")
        .not("published_at", "is", null);
      if (live.error) throw new Error("publication recheck failed");
      const liveIds = new Set((live.data ?? []).map((o) => o.id));
      const rows = plan.filter((p) => liveIds.has(p.opportunity_id));
      if (!rows.length) continue;

      const ins = await db
        .from("user_notifications")
        .upsert(rows, { onConflict: "user_id,event_key", ignoreDuplicates: true })
        .select("id");
      if (ins.error) throw new Error("insert failed");
      result.inserted += ins.data?.length ?? 0;
    } catch (e) {
      result.failures++;
      // Log without user IDs or opportunity details.
      console.error("[a18-worker] account processing failed:", (e as Error).message);
    }
  }
  return result;
}
