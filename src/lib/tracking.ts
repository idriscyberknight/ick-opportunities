import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";

export type ApplicationStatus = Enums<"application_status">;
export type TrackingRow = Tables<"application_tracking">;
export type TrackedOpportunity = TrackingRow & {
  opportunities: Tables<"opportunities"> | null;
};

export const TRACKING_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

export function statusLabel(status: ApplicationStatus) {
  return TRACKING_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export const statusStyles: Record<ApplicationStatus, string> = {
  interested: "bg-secondary/10 text-secondary",
  applied: "bg-primary/10 text-primary",
  interview: "bg-accent text-accent-foreground",
  accepted: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

/** All tracking records for the current user, with the joined opportunity. */
export async function fetchTrackedOpportunities(userId: string) {
  const { data, error } = await supabase
    .from("application_tracking")
    .select("*, opportunities(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TrackedOpportunity[];
}

/** Map of opportunity_id -> tracking row for the current user. */
export async function fetchTrackingMap(userId: string) {
  const { data, error } = await supabase
    .from("application_tracking")
    .select("id, opportunity_id, status")
    .eq("user_id", userId);
  if (error) throw error;
  const map = new Map<string, { id: string; status: ApplicationStatus }>();
  (data ?? []).forEach((r) => map.set(r.opportunity_id, { id: r.id, status: r.status }));
  return map;
}

export async function trackOpportunity(
  userId: string,
  opportunityId: string,
  status: ApplicationStatus,
) {
  const { error } = await supabase
    .from("application_tracking")
    .insert({ user_id: userId, opportunity_id: opportunityId, status });
  if (error) throw error;
}

export async function updateTrackingStatus(
  trackingId: string,
  userId: string,
  status: ApplicationStatus,
) {
  const { error } = await supabase
    .from("application_tracking")
    .update({ status })
    .eq("id", trackingId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeTracking(trackingId: string, userId: string) {
  const { error } = await supabase
    .from("application_tracking")
    .delete()
    .eq("id", trackingId)
    .eq("user_id", userId);
  if (error) throw error;
}
