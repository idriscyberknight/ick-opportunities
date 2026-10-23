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
    .order("relevance_score", { ascending: false, nullsFirst: false })
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

  if (!uid) {
    throw new Error("Not signed in");
  }

  // Preliminary validation before approval or publication.
  // This client-side check is NOT a database security boundary.
  if (action === "approved" || action === "published") {
    if (Object.keys(edits).length > 0) {
      throw new Error(
        "Save your changes before approving or publishing."
      );
    }

    const { data: record, error: readError } = await supabase
      .from("opportunities")
      .select(
        "status, verified_status, title, organization, description, official_link, deadline"
      )
      .eq("id", item.id)
      .single();

    if (readError) throw readError;

    if (!record) {
      throw new Error("Opportunity not found.");
    }

    if (record.status !== "draft") {
      throw new Error("Only drafts can be reviewed.");
    }

    if (
      !record.title.trim() ||
      !record.organization.trim() ||
      !record.description.trim()
    ) {
      throw new Error(
        "Required opportunity information is missing."
      );
    }

    let officialUrl: URL;

    try {
      officialUrl = new URL(record.official_link ?? "");
    } catch {
      throw new Error("A valid official source URL is required.");
    }

    if (officialUrl.protocol !== "https:") {
      throw new Error(
        "The official source must use HTTPS."
      );
    }

    if (
      record.deadline &&
      record.deadline < new Date().toISOString().slice(0, 10)
    ) {
      throw new Error(
        "This opportunity has an expired deadline."
      );
    }

    if (
      action === "published" &&
      record.verified_status !== "verified"
    ) {
      throw new Error(
        "Approve this opportunity before publishing."
      );
    }
  }

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
