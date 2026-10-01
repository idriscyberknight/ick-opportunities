import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Source = Tables<"opportunity_sources">;
export type SourceType = Source["source_type"];
export type AuditLog = Tables<"opportunity_audit_logs">;

export const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: "scholarship", label: "Scholarship website" },
  { value: "grant", label: "Grant website" },
  { value: "fellowship", label: "Fellowship website" },
  { value: "career_page", label: "Company career page" },
  { value: "internship", label: "Internship source" },
];

export async function fetchSources() {
  const { data, error } = await supabase
    .from("opportunity_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSource(input: TablesInsert<"opportunity_sources">) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("opportunity_sources")
    .insert({ ...input, created_by: u.user?.id ?? null });
  if (error) throw error;
}

export async function updateSource(id: string, input: TablesUpdate<"opportunity_sources">) {
  const { error } = await supabase.from("opportunity_sources").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteSource(id: string) {
  const { error } = await supabase.from("opportunity_sources").delete().eq("id", id);
  if (error) throw error;
}

/** Drafts awaiting a decision, with their source name. */
export async function fetchReviewQueue() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, opportunity_sources(source_name, source_url)")
    .eq("status", "draft")
    .order("discovered_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type ReviewItem = Awaited<ReturnType<typeof fetchReviewQueue>>[number];

export async function fetchRecentAudit(limit = 30) {
  const { data, error } = await supabase
    .from("opportunity_audit_logs")
    .select("*, opportunity_sources(source_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type ReviewAction = "approved" | "published" | "rejected" | "edited";

/** Apply a review decision and record it in the audit log. */
export async function reviewOpportunity(
  item: Pick<ReviewItem, "id" | "title" | "source_id">,
  action: ReviewAction,
  edits: TablesUpdate<"opportunities"> = {},
) {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Not signed in");
  const now = new Date().toISOString();
  const patch: TablesUpdate<"opportunities"> = { ...edits, reviewed_by: uid, reviewed_at: now };
  if (action === "approved") patch.verified_status = "verified";
  if (action === "published") {
    patch.verified_status = "verified";
    patch.status = "active";
    patch.published_at = now;
  }
  if (action === "rejected") patch.status = "rejected";

  const { error } = await supabase.from("opportunities").update(patch).eq("id", item.id);
  if (error) throw error;
  await supabase.from("opportunity_audit_logs").insert({
    opportunity_id: item.id,
    opportunity_title: edits.title ?? item.title,
    source_id: item.source_id,
    action,
    actor_id: uid,
  });
}
