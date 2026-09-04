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

export const Route = createFileRoute("/opportunities/$id")({
  head: () => ({
    meta: [
      { title: "Opportunity details — ICK Opportunities" },
      {
        name: "description",
        content:
          "Eligibility, benefits, deadline and the official application link for this opportunity.",
      },
      { property: "og:title", content: "Opportunity details — ICK Opportunities" },
      {
        property: "og:description",
        content:
          "Eligibility, benefits, deadline and the official application link for this opportunity.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
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
            <BadgeCheck className="h-4 w-4" /> Verified against official source
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Pending review
          </span>
        )}
      </div>

      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
        {data.title}
      </h1>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Building2 className="h-4 w-4" /> {data.organization}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" /> {locationLabel(data)}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4" /> Deadline: {formatDeadline(data.deadline)}
        </span>
      </div>

      <Section title="About this opportunity" body={data.description} />
      <Section title="Eligibility" body={data.eligibility} />
      <Section title="Benefits" body={data.benefits} />

      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">Ready to apply?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Applications are submitted on the provider&apos;s official website. ICK
          Opportunities never asks for application fees.
        </p>
        {data.official_link ? (
          <a
            href={data.official_link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Apply on Official Website
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="mt-4 text-sm font-medium text-muted-foreground">
            No official application link has been recorded for this listing yet.
          </p>
        )}
      </div>
    </div>
  );
}
