import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabel,
  categoryStyles,
  fetchOpportunityById,
  formatDeadline,
  locationLabel,
} from "@/lib/opportunities";
import { SaveOpportunityButton } from "@/components/SaveOpportunityButton";
import { TrackOpportunityButton } from "@/components/TrackOpportunityButton";
import { ShareOpportunity } from "@/components/ShareOpportunity";
import { EligibilityQuickCheck } from "@/components/EligibilityQuickCheck";
import { OrganizationAvatar } from "@/components/OrganizationAvatar";
import { SITE_ORIGIN } from "@/lib/site";
import { buildOpportunityJsonLd, serializeJsonLd } from "@/lib/structured-data";
import { ApplicationBlueprint } from "@/components/ApplicationBlueprint";

/** Fallback metadata is used whenever the record is not publicly visible. */
const FALLBACK_TITLE = "Opportunity details — ICK Opportunities";
const FALLBACK_DESCRIPTION =
  "Eligibility, benefits, deadline and the source link for this opportunity.";

/**
 * Keep meta descriptions compact but never cut off the deadline sentence:
 * social previews render ~200 chars even where search display truncates.
 */
function truncateMetaDescription(text: string, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

function buildMetaDescription(opportunity: {
  title: string;
  deadline: string | null;
}) {
  const deadlineSuffix = opportunity.deadline
    ? ` Applications close ${formatDeadline(opportunity.deadline)}.`
    : "";
  return truncateMetaDescription(
    `Apply for the ${opportunity.title}. View eligibility requirements, benefits, deadline and the source link.${deadlineSuffix}`,
  );
}

export const Route = createFileRoute("/opportunities/$id")({
  // Loads the record during SSR so metadata renders in the server HTML for
  // crawlers and social previews. Uses the same query cache as the page.
  loader: ({ params, context }) =>
    context.queryClient
      .ensureQueryData({
        queryKey: ["opportunity", params.id],
        queryFn: () => fetchOpportunityById(params.id),
      })
      .catch(() => null),
  head: ({ params, loaderData }) => {
    const opportunity = loaderData ?? null;
    const canonicalUrl = `${SITE_ORIGIN}/opportunities/${params.id}`;

    const title = opportunity
      ? `${opportunity.title} | ICK Opportunities`
      : FALLBACK_TITLE;
    const description = opportunity
      ? buildMetaDescription(opportunity)
      : FALLBACK_DESCRIPTION;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonicalUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        // No publicly visible record -> keep it out of search indexes.
        ...(opportunity ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      // Structured data for search engines and AI assistants (see src/lib/structured-data.ts).
      ...(opportunity
        ? {
            scripts: [
              {
                type: "application/ld+json",
                children: serializeJsonLd(buildOpportunityJsonLd(opportunity)),
              },
            ],
          }
        : {}),
    };
  },
  component: OpportunityDetailPage,
});

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body?.trim()) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
        {body}
      </p>
    </section>
  );
}

function OpportunityDetailPage() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: () => fetchOpportunityById(id),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunity…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Opportunity not available
        </h1>
        <p className="mt-3 text-muted-foreground">
          This listing may have been unpublished or its deadline has passed.
        </p>
        <Link
          to="/opportunities"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Browse opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All opportunities
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
            categoryStyles[data.category],
          )}
        >
          {categoryLabel(data.category)}
        </span>
        {data.verified_status === "verified" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <BadgeCheck className="h-4 w-4" /> Reviewed by ICK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Pending review
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <TrackOpportunityButton opportunityId={data.id} />
          <SaveOpportunityButton opportunityId={data.id} />
        </span>
      </div>

      <div className="mt-4 flex items-start gap-4">
  <OrganizationAvatar name={data.organization} category={data.category} size="lg" />
  <div className="min-w-0 flex-1">
    <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
      {data.title}
    </h1>
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Building2 className="h-4 w-4" /> {data.organization}
      </span>
      <span className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4" /> {locationLabel(data)}
      </span>
      <span className="flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4" /> Deadline: {formatDeadline(data.deadline)}
      </span>
    </div>
  </div>
</div>
      
<EligibilityQuickCheck opportunity={data} />
        
      <Section title="About this opportunity" body={data.description} />
      <Section title="Eligibility" body={data.eligibility} />
      <Section title="Benefits" body={data.benefits} />
      <Section title="About this opportunity" body={data.description} />
      <Section title="Eligibility" body={data.eligibility} />
      <Section title="Benefits" body={data.benefits} />

      <ApplicationBlueprint opportunity={data} />

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Ready to apply?</h2>
  
      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Ready to apply?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the deadline and requirements on the source page before you apply.
          ICK Opportunities never asks for application fees.
        </p>
        {data.official_link ? (
          <a
            href={data.official_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Go to source page
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            No source link has been recorded for this listing yet.
          </p>
        )}
      </div>

      <ShareOpportunity opportunity={data} />
    </div>
  );
}
