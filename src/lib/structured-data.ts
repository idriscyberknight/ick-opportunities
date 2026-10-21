import type { Opportunity } from "@/lib/opportunities";
import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from "@/lib/site";

/**
 * JSON-LD for opportunity pages.
 *
 * Rules this file follows (structured data must describe what the page shows):
 * - job / internship -> schema.org JobPosting, but ONLY when the fields Google
 *   requires are present (title, description, organisation, posting date and a
 *   country it can express as an ISO code). Otherwise no JobPosting is emitted.
 * - scholarship / grant -> schema.org Grant (funder = the organisation). Google
 *   has no rich result for these, but the markup is valid and machine-readable.
 * - EducationalOccupationalCredential is deliberately NOT used: it describes a
 *   credential someone earns (a degree or certificate), not funding for study.
 * - Every page also gets WebPage + BreadcrumbList.
 */

type JsonObject = Record<string, unknown>;

/** ISO 3166-1 alpha-2 codes for countries listed so far. Unknown names return undefined. */
const COUNTRY_CODES: Record<string, string> = {
  nigeria: "NG",
  ghana: "GH",
  kenya: "KE",
  "south africa": "ZA",
  egypt: "EG",
  morocco: "MA",
  tanzania: "TZ",
  uganda: "UG",
  rwanda: "RW",
  ethiopia: "ET",
  senegal: "SN",
  "saudi arabia": "SA",
  "united arab emirates": "AE",
  uae: "AE",
  qatar: "QA",
  kuwait: "KW",
  turkey: "TR",
  türkiye: "TR",
  turkiye: "TR",
  malaysia: "MY",
  indonesia: "ID",
  pakistan: "PK",
  india: "IN",
  bangladesh: "BD",
  china: "CN",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  singapore: "SG",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  canada: "CA",
  germany: "DE",
  france: "FR",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  sweden: "SE",
  norway: "NO",
  finland: "FI",
  denmark: "DK",
  ireland: "IE",
  poland: "PL",
  "czech republic": "CZ",
  hungary: "HU",
  australia: "AU",
  "new zealand": "NZ",
  brazil: "BR",
  mexico: "MX",
};

function countryCode(name: string | null): string | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(key)) return key.toUpperCase();
  return COUNTRY_CODES[key];
}

function isoDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Full text shown on the page: description, eligibility and benefits. */
function fullDescription(o: Opportunity): string {
  return [
    o.description,
    o.eligibility ? `Eligibility: ${o.eligibility}` : "",
    o.benefits ? `Benefits: ${o.benefits}` : "",
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

const CATEGORY_PAGES: Record<Opportunity["category"], { path: string; label: string }> = {
  scholarship: { path: "/scholarships", label: "Scholarships" },
  job: { path: "/jobs", label: "Jobs" },
  internship: { path: "/internships", label: "Internships" },
  grant: { path: "/grants", label: "Grants" },
};

function buildJobPosting(o: Opportunity, url: string): JsonObject | null {
  const country = countryCode(o.country);
  const datePosted = isoDate(o.published_at ?? o.reviewed_at ?? o.created_at);
  const description = fullDescription(o);
  if (!country || !datePosted || !description || !o.organization.trim()) return null;

  return {
    "@type": "JobPosting",
    "@id": `${url}#entity`,
    title: o.title,
    description,
    datePosted,
    // Deadlines are calendar dates; treat them as end of day in Nigeria (UTC+1).
    ...(o.deadline ? { validThrough: `${o.deadline}T23:59:59+01:00` } : {}),
    ...(o.category === "internship" ? { employmentType: "INTERN" } : {}),
    hiringOrganization: { "@type": "Organization", name: o.organization },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: country,
        ...(o.state ? { addressRegion: o.state } : {}),
      },
    },
    // Applications happen on the employer's own page, not on this site.
    directApply: false,
    url,
  };
}

function buildGrant(o: Opportunity, url: string): JsonObject {
  return {
    "@type": "Grant",
    "@id": `${url}#entity`,
    name: o.title,
    description: fullDescription(o),
    url,
    funder: { "@type": "Organization", name: o.organization },
  };
}

export function buildOpportunityJsonLd(o: Opportunity): JsonObject {
  const url = absoluteUrl(`/opportunities/${o.id}`);
  const page = CATEGORY_PAGES[o.category];
  const isJob = o.category === "job" || o.category === "internship";
  const entity = isJob ? buildJobPosting(o, url) : buildGrant(o, url);
  const published = isoDate(o.published_at ?? o.reviewed_at ?? o.created_at);
  const modified = isoDate(o.updated_at);

  const graph: JsonObject[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: o.title,
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_ORIGIN },
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      breadcrumb: { "@id": `${url}#breadcrumb` },
      ...(entity ? { mainEntity: { "@id": `${url}#entity` } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: page.label, item: absoluteUrl(page.path) },
        { "@type": "ListItem", position: 3, name: o.title, item: url },
      ],
    },
  ];
  if (entity) graph.push(entity);

  return { "@context": "https://schema.org", "@graph": graph };
}

/** Serialises JSON-LD so database text can never close the script tag. */
export function serializeJsonLd(data: JsonObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
