/**
 * A1.5 University Registry admin API.
 *
 * This is intentionally a draft-only, authenticated administrative workflow.
 * PostgreSQL GRANT + RLS policies are the authoritative access control.
 * Neither this module nor the UI grants access, verifies evidence, or publishes.
 * Schema-verified types for the four installed tables are isolated in
 * university-registry-schema.types.ts while Lovable's automatically generated
 * integration types await authoritative regeneration. Reconcile source history
 * and strictly typecheck before any release.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UniversityEvidenceReviewDatabase } from "@/lib/university-registry-schema.types";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/opportunities";

const registry = supabase as unknown as SupabaseClient<UniversityEvidenceReviewDatabase>;

/**
 * FAIL CLOSED. The A1.6.2 SQL review RPC and audit table are NOT installed in
 * Production. Only enable this in a separately approved release after the
 * backend, grants, auth tests, and migration history are verified together.
 * Frontend flag is not a security boundary: database authorization remains
 * authoritative.
 */
export const A16_EVIDENCE_REVIEW_RELEASE_ENABLED = false;
export type EvidenceReviewDecision = "reviewed" | "rejected";

export type RegistryUniversity = {
  id: string;
  slug: string;
  official_name: string;
  country_code: string;
  city: string | null;
  official_website: string | null;
  summary: string | null;
  verification_status: string;
  publication_status: string;
  created_at: string;
};

export type RegistryAlias = {
  id: string;
  university_id: string;
  alias: string;
  language_code: string | null;
};

export type RegistryEvidence = {
  id: string;
  university_id: string;
  claim_type: string;
  source_url: string;
  source_title: string | null;
  review_status: string;
};

export type RegistryClassification = {
  id: string;
  university_id: string;
  classification_key: string;
  evidence_id: string;
  review_status: string;
};

export type RegistrySnapshot = {
  universities: RegistryUniversity[];
  aliases: RegistryAlias[];
  evidence: RegistryEvidence[];
  classifications: RegistryClassification[];
};

const universityColumns =
  "id,slug,official_name,country_code,city,official_website,summary,verification_status,publication_status,created_at";

async function requireAdmin(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to manage universities.");
  if (!(await isCurrentUserAdmin())) throw new Error("Administrator permission required.");
  return data.user.id;
}

function requiredText(value: string, label: string, max = 250): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) {
    throw new Error(`${label} must be 1–${max} characters.`);
  }
  return trimmed;
}

function checkedUrl(value: string): string {
  const candidate = requiredText(value, "Official source URL", 1800);
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Enter a complete HTTPS URL.");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Only HTTPS URLs without embedded credentials are accepted.");
  }
  return parsed.toString();
}

function assertSlug(slug: string): string {
  const clean = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean) || clean.length > 100) {
    throw new Error("Slug must use lowercase letters, digits and hyphens.");
  }
  return clean;
}

export async function listAdminUniversityRegistry(): Promise<RegistrySnapshot> {
  await requireAdmin();
  const [u, a, e, c] = await Promise.all([
    registry
      .from("universities")
      .select(universityColumns)
      .order("created_at", { ascending: false })
      .limit(150),
    registry.from("university_aliases").select("id,university_id,alias,language_code").limit(500),
    registry
      .from("university_evidence")
      .select("id,university_id,claim_type,source_url,source_title,review_status")
      .limit(500),
    registry
      .from("university_classifications")
      .select("id,university_id,classification_key,evidence_id,review_status")
      .limit(500),
  ]);
  const err = u.error || a.error || e.error || c.error;
  if (err) throw new Error(err.message);
  return {
    universities: (u.data ?? []) as RegistryUniversity[],
    aliases: (a.data ?? []) as RegistryAlias[],
    evidence: (e.data ?? []) as RegistryEvidence[],
    classifications: (c.data ?? []) as RegistryClassification[],
  };
}

export async function createUniversityDraft(input: {
  slug: string;
  official_name: string;
  country_code: string;
  city?: string;
  official_website?: string;
  summary?: string;
}): Promise<void> {
  const userId = await requireAdmin();
  const country = input.country_code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Use a two-letter ISO country code.");
  const { error } = await registry.from("universities").insert({
    slug: assertSlug(input.slug),
    official_name: requiredText(input.official_name, "Institution name"),
    country_code: country,
    city: input.city?.trim() || null,
    official_website: input.official_website?.trim() ? checkedUrl(input.official_website) : null,
    summary: input.summary?.trim() || null,
    created_by: userId,
    verification_status: "pending_review",
    publication_status: "draft",
    reviewed_at: null,
    reviewed_by: null,
    published_at: null,
  });
  if (error) throw new Error(error.message);
}

export async function updateUniversityDraft(
  id: string,
  patch: {
    official_name: string;
    country_code: string;
    city: string;
    official_website: string;
    summary: string;
  },
): Promise<void> {
  await requireAdmin();
  // Review metadata is protected server-side in A1.6.2; never reset it through
  // an ordinary Admin PATCH. The database trigger will additionally prevent
  // silently editing identity fields after any source has been reviewed.
  const country = patch.country_code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Use a two-letter ISO country code.");
  const { data, error } = await registry
    .from("universities")
    .update({
      official_name: requiredText(patch.official_name, "Institution name"),
      country_code: country,
      city: patch.city.trim() || null,
      official_website: patch.official_website.trim() ? checkedUrl(patch.official_website) : null,
      summary: patch.summary.trim() || null,
    })
    .eq("id", id)
    .eq("publication_status", "draft")
    .eq("verification_status", "pending_review")
    .select("id");
  if (error) throw new Error(error.message);
  if (data?.length !== 1) throw new Error("Draft was not updated. Refresh and verify its state.");
}

export async function createUniversityAlias(
  universityId: string,
  alias: string,
  languageCode: string,
): Promise<void> {
  await requireAdmin();
  const lang = languageCode.trim() || null;
  if (lang && (lang.length < 2 || lang.length > 35))
    throw new Error("Language code must be 2–35 characters.");
  const { error } = await registry.from("university_aliases").insert({
    university_id: universityId,
    alias: requiredText(alias, "Alias"),
    language_code: lang,
  });
  if (error) throw new Error(error.message);
}

export const EVIDENCE_CLAIMS = [
  "identity",
  "website",
  "classification",
  "programmes",
  "accreditation",
  "other",
] as const;
export type EvidenceClaim = (typeof EVIDENCE_CLAIMS)[number];

export async function createUniversityEvidence(
  universityId: string,
  sourceUrl: string,
  claimType: EvidenceClaim,
  sourceTitle: string,
): Promise<void> {
  await requireAdmin();
  if (!EVIDENCE_CLAIMS.includes(claimType)) throw new Error("Invalid evidence claim type.");
  const { error } = await registry.from("university_evidence").insert({
    university_id: universityId,
    source_url: checkedUrl(sourceUrl),
    claim_type: claimType,
    source_title: sourceTitle.trim() || null,
    review_status: "pending_review",
    visibility: "internal",
    checked_at: null,
    checked_by: null,
  });
  if (error) throw new Error(error.message);
}

export const CLASSIFICATIONS = [
  "islamic_institution",
  "islamic_studies_provider",
  "general_institution",
] as const;
export type ClassificationKey = (typeof CLASSIFICATIONS)[number];

export async function createUniversityClassification(
  universityId: string,
  classificationKey: ClassificationKey,
  evidenceId: string,
): Promise<void> {
  await requireAdmin();
  if (!CLASSIFICATIONS.includes(classificationKey)) throw new Error("Invalid classification.");
  const { error } = await registry.from("university_classifications").insert({
    university_id: universityId,
    classification_key: classificationKey,
    evidence_id: evidenceId,
    review_status: "pending_review",
  });
  // Composite FK in PostgreSQL also requires evidence to belong to same university.
  if (error) throw new Error(error.message);
}

/**
 * A1.6.2 FUTURE server-transactional source decision. The current deployment
 * does not have this RPC. Do not bypass the release gate or write review_status
 * directly from the client.
 */
export async function reviewUniversityEvidence(
  evidenceId: string,
  decision: EvidenceReviewDecision,
  reason: string,
): Promise<string> {
  if (!A16_EVIDENCE_REVIEW_RELEASE_ENABLED) {
    throw new Error("Editorial review is not enabled until backend security release.");
  }

  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(evidenceId)) {
    throw new Error("Select a valid evidence record.");
  }
  if (decision !== "reviewed" && decision !== "rejected") {
    throw new Error("Invalid review decision.");
  }
  const rationale = reason.trim();
  if (rationale.length < 20 || rationale.length > 2000) {
    throw new Error("Review reason must be 20–2000 characters.");
  }

  const { data, error } = await registry.rpc("ick_a16_review_evidence", {
    p_evidence_id: evidenceId,
    p_decision: decision,
    p_reason: rationale,
    p_expected_state: "pending_review",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The review did not return an audit event ID.");
  return data;
}
