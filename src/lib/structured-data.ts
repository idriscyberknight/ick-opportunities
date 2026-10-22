import type { Opportunity } from "@/lib/opportunities";
import { SITE_NAME, SITE_ORIGIN, absoluteUrl } from "@/lib/site";

type JsonObject = Record<string, unknown>;

/**
 * JobPosting is intentionally disabled until the application stores
 * a verified original employer posting date and source-backed job details.
 *
 * Jobs and internships retain WebPage and BreadcrumbList markup.
 * Scholarships and grants retain Grant markup.
 */

function isoDate(value: string | null): string | undefined {
  if (!value?.trim()) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

/** Use the same recorded text displayed on the opportunity page. */
function fullDescription(o: Opportunity): string {
  return [
    o.description ?? "",
    o.eligibility ? `Eligibility: ${o.eligibility}` : "",
    o.benefits ? `Benefits: ${o.benefits}` : "",
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

const CATEGORY_PAGES: Record<
  Opportunity["category"],
  { path: string; label: string }
> = {
  scholarship: {
    path: "/scholarships",
    label: "Scholarships",
  },
  job: {
    path: "/jobs",
    label: "Jobs",
  },
  internship: {
    path: "/internships",
    label: "Internships",
  },
  grant: {
    path: "/grants",
    label: "Grants",
  },
};

function buildGrant(o: Opportunity, url: string): JsonObject {
  const organization = o.organization.trim();

  return {
    "@type": "Grant",
    "@id": `${url}#entity`,
    name: o.title,
    description: fullDescription(o),
    url,
    ...(organization
      ? {
          funder: {
            "@type": "Organization",
            name: organization,
          },
        }
      : {}),
  };
}

export function buildOpportunityJsonLd(o: Opportunity): JsonObject {
  const url = absoluteUrl(`/opportunities/${o.id}`);
  const page = CATEGORY_PAGES[o.category];

  const isFunding =
    o.category === "scholarship" || o.category === "grant";

  const entity = isFunding ? buildGrant(o, url) : null;

  // Publication of the ICK page, not the employer's original posting date.
  // Do not substitute review or database creation timestamps.
  const published = isoDate(o.published_at);
  const modified = isoDate(o.updated_at);

  const graph: JsonObject[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: o.title,
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
      },
      ...(published ? { datePublished: published } : {}),
      ...(modified ? { dateModified: modified } : {}),
      breadcrumb: {
        "@id": `${url}#breadcrumb`,
      },
      ...(entity
        ? {
            mainEntity: {
              "@id": `${url}#entity`,
            },
          }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.label,
          item: absoluteUrl(page.path),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: o.title,
          item: url,
        },
      ],
    },
  ];

  if (entity) graph.push(entity);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/** Escape characters that could interfere with the enclosing script. */
export function serializeJsonLd(data: JsonObject): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
          }
