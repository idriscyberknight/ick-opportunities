/**
 * A1.7 — deterministic read-only reconciliation of the existing public
 * university starter directory with the private, RLS-guarded Admin registry.
 *
 * A match is a REVIEW CANDIDATE, not proof of institutional identity.
 * Never create records, rewrite slugs, approve evidence or publish based on
 * this matching function. All private rows stay in Admin-only UI.
 */
import {
  normalizeUniversityTerm,
  STARTER_UNIVERSITIES,
  type UniversityRecord,
} from "@/lib/university-directory";
import type { RegistryAlias, RegistryUniversity } from "@/lib/university-registry-admin";

export type ReconciliationStatus = "unmatched" | "candidate" | "ambiguous" | "country_conflict";

export type ReconciledStarter = {
  starter: (typeof STARTER_UNIVERSITIES)[number];
  status: ReconciliationStatus;
  candidateIds: readonly string[];
  reasons: readonly string[];
};

export type UniversityReconciliation = {
  entries: ReconciledStarter[];
  privateOnly: RegistryUniversity[];
  candidates: number;
  ambiguous: number;
  countryConflicts: number;
  unmatched: number;
};

function normalizedHostname(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function namesForUniversity(
  row: RegistryUniversity,
  aliases: readonly RegistryAlias[],
): Set<string> {
  const names = [row.official_name];
  aliases.forEach((item) => {
    if (item.university_id === row.id) names.push(item.alias);
  });
  return new Set(names.map(normalizeUniversityTerm).filter(Boolean));
}

/**
 * Only same-country name/alias, same-country slug, or same-country HTTPS
 * host yields an identity candidate. Same slug in DIFFERENT countries is
 * a hard conflict. No fuzzy matching, no automatic merges.
 *
 * An entirely unmatched private row remains private-only. This matters
 * because the current Production registry contains a noncanonical draft.
 */
export function reconcileUniversityDirectory(
  privateUniversities: readonly RegistryUniversity[],
  privateAliases: readonly RegistryAlias[],
): UniversityReconciliation {
  const linkedIds = new Set<string>();
  let candidates = 0;
  let ambiguous = 0;
  let countryConflicts = 0;
  let unmatched = 0;

  const entries: ReconciledStarter[] = STARTER_UNIVERSITIES.map((starter) => {
    const aliases = new Set(
      [starter.name, ...starter.aliases].map(normalizeUniversityTerm).filter(Boolean),
    );
    const starterHost = normalizedHostname(starter.officialWebsite);
    const matches: { id: string; reason: string }[] = [];
    const crossCountrySlugs: string[] = [];

    for (const row of privateUniversities) {
      if (row.slug === starter.slug && row.country_code !== starter.countryCode) {
        crossCountrySlugs.push(row.id);
        continue;
      }
      if (row.country_code !== starter.countryCode) continue;

      const privateNames = namesForUniversity(row, privateAliases);
      const nameMatch = [...aliases].some((name) => privateNames.has(name));
      const domainMatch = !!starterHost && normalizedHostname(row.official_website) === starterHost;
      const slugMatch = row.slug === starter.slug;

      if (slugMatch || nameMatch || domainMatch) {
        const reason = [
          slugMatch ? "canonical slug" : null,
          nameMatch ? "institution name / alias" : null,
          domainMatch ? "official site hostname" : null,
        ]
          .filter(Boolean)
          .join(", ");
        matches.push({ id: row.id, reason });
      }
    }

    let status: ReconciliationStatus;
    if (crossCountrySlugs.length > 0) {
      status = "country_conflict";
      countryConflicts += 1;
    } else if (matches.length > 1) {
      status = "ambiguous";
      ambiguous += 1;
    } else if (matches.length === 1) {
      status = "candidate";
      candidates += 1;
    } else {
      status = "unmatched";
      unmatched += 1;
    }
    const firstMatch = matches[0];
    if (status === "candidate" && firstMatch) linkedIds.add(firstMatch.id);

    return {
      starter,
      status,
      candidateIds: [...matches.map((item) => item.id), ...crossCountrySlugs],
      reasons: [
        ...matches.map((item) => item.reason),
        ...(crossCountrySlugs.length > 0 ? ["same slug but conflicting country"] : []),
      ],
    };
  });

  return {
    entries,
    privateOnly: privateUniversities.filter((row) => !linkedIds.has(row.id)),
    candidates,
    ambiguous,
    countryConflicts,
    unmatched,
  };
}

/**
 * A1.7.2 deliberately returns only client-side FORM values. It does not call
 * any database API and never changes verification_status, review metadata,
 * aliases, classification, publication or public directory URLs.
 *
 * The static directory is an unverified research starting point, so summaries
 * are left blank. For a website flagged for re-verification (e.g. Niger), the
 * canonical domain must be manually confirmed rather than inherited.
 */
export function prepareStarterPrivateDraft(starter: UniversityRecord) {
  return {
    slug: starter.slug,
    official_name: starter.name,
    country_code: starter.countryCode,
    city: starter.location?.includes("/") ? "" : (starter.location ?? ""),
    official_website: starter.websiteVerification === "needs_review" ? "" : starter.officialWebsite,
    summary: "",
  };
}
