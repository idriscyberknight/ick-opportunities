import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Opportunity = Tables<"opportunities">;
export type OpportunityInput = TablesInsert<"opportunities">;
export type OpportunityCategory = Opportunity["category"];
export type OpportunityStatus = Opportunity["status"];
export type VerifiedStatus = Opportunity["verified_status"];

export const CATEGORIES: { value: OpportunityCategory; label: string }[] = [
  { value: "scholarship", label: "Scholarship" },
  { value: "job", label: "Job" },
  { value: "internship", label: "Internship" },
  { value: "grant", label: "Grant" },
];

export const STATUSES: { value: OpportunityStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "expired", label: "Expired" },
];

export const VERIFIED_STATES: { value: VerifiedStatus; label: string }[] = [
  { value: "verified", label: "Verified" },
  { value: "pending_review", label: "Pending review" },
];

export const categoryLabel = (c: OpportunityCategory) =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;

export const categoryStyles: Record<OpportunityCategory, string> = {
  scholarship: "bg-secondary/10 text-secondary",
  job: "bg-primary/10 text-primary",
  internship: "bg-muted text-muted-foreground",
  grant: "bg-success/10 text-success",
};

export function formatDeadline(deadline: string | null) {
  if (!deadline) return "No stated deadline";
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function locationLabel(o: Pick<Opportunity, "country" | "state">) {
  return [o.state, o.country].filter(Boolean).join(", ") || "Not specified";
}

export type PublicFilters = {
  search?: string;
  category?: OpportunityCategory | "all";
  country?: string;
};

/** Public listing: RLS only exposes active, non-expired rows. */
export async function fetchPublicOpportunities(filters: PublicFilters = {}) {
  let query = supabase
    .from("opportunities")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters.country && filters.country !== "all") {
    query = query.eq("country", filters.country);
  }
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%,()]/g, " ");
    query = query.or(
      `title.ilike.%${term}%,organization.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchOpportunityById(id: string) {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin listing: RLS grants admins visibility of every row. */
export async function fetchAllOpportunities() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function isCurrentUserAdmin() {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function createOpportunity(input: OpportunityInput) {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...input, created_by: userData.user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateOpportunity(id: string, input: Partial<OpportunityInput>) {
  const { data, error } = await supabase
    .from("opportunities")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteOpportunity(id: string) {
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw error;
}
