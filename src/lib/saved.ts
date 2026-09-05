import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SavedOpportunityRow = Tables<"saved_opportunities">;
export type Opportunity = Tables<"opportunities">;

/** IDs of opportunities saved by the current user. */
export async function fetchSavedOpportunityIds(userId: string) {
  const { data, error } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.opportunity_id);
}

/** Full opportunity rows saved by the current user, newest save first. */
export async function fetchSavedOpportunities(userId: string) {
  const { data, error } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id, created_at, opportunities(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.opportunities)
    .filter((o): o is NonNullable<typeof o> => !!o);
}

export async function saveOpportunity(userId: string, opportunityId: string) {
  const { error } = await supabase
    .from("saved_opportunities")
    .insert({ user_id: userId, opportunity_id: opportunityId });
  if (error) throw error;
}

export async function unsaveOpportunity(userId: string, opportunityId: string) {
  const { error } = await supabase
    .from("saved_opportunities")
    .delete()
    .eq("user_id", userId)
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
}
