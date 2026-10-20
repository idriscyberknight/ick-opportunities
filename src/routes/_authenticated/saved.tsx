import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Loader2,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchSavedOpportunities } from "@/lib/saved";
import {
  categoryLabel,
  categoryStyles,
  formatDeadline,
  locationLabel,
} from "@/lib/opportunities";
import { SaveOpportunityButton } from "@/components/SaveOpportunityButton";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved Opportunities — ICK Opportunities" },
      {
        name: "description",
        content: "Opportunities you have saved to revisit and apply to later.",
      },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["saved-opportunities", user?.id],
    queryFn: () => fetchSavedOpportunities(user!.id),
    enabled: !!user,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
          Saved opportunities
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Opportunities you have bookmarked to revisit and apply to later.
        </p>
      </header>

      {isLoading ? (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading saved opportunities…
        </div>
      ) : isError ? (
        <p className="mt-12 text-sm text-destructive">
          We could not load your saved opportunities right now. Please try again shortly.
        </p>
      ) : !data || data.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 font-display text-lg font-bold text-foreground">
            No saved opportunities yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            When you find a scholarship, job, internship or grant you like, tap Save
            and it will appear here.
          </p>
          <Link
            to="/opportunities"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse opportunities
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground">
            {data.length} saved {data.length === 1 ? "opportunity" : "opportunities"}
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((o) => (
              <article
                key={o.id}
                className="group flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,0.45)]"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                        categoryStyles[o.category],
                      )}
                    >
                      {categoryLabel(o.category)}
                    </span>
                    {o.verified_status === "verified" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  <SaveOpportunityButton opportunityId={o.id} />
                </div>

                <h2 className="mt-3 font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-foreground">
                  {o.title}
                </h2>
                <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                  {o.organization}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {o.description}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {locationLabel(o)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDeadline(o.deadline)}
                  </span>
                </div>

                <div className="mt-5 border-t border-border pt-4">
                  <Link
                    to="/opportunities/$id"
                    params={{ id: o.id }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    View details
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
