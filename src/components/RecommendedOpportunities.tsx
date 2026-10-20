import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Loader2, MapPin, Sparkles, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/lib/profile";
import {
  categoryLabel,
  categoryStyles,
  fetchPublicOpportunities,
  formatDeadline,
  locationLabel,
} from "@/lib/opportunities";
import { isProfileReadyForMatching, rankOpportunities } from "@/lib/matching";
import { SaveOpportunityButton } from "@/components/SaveOpportunityButton";
import { TrackOpportunityButton } from "@/components/TrackOpportunityButton";

/**
 * Shared recommendations list. Reuses the same query keys as the public
 * browser and profile so data is fetched once and cached across pages.
 */
export function RecommendedOpportunities({ limit }: { limit?: number }) {
  const { user, loading: authLoading } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });
  const oppQuery = useQuery({
    queryKey: ["opportunities", "public", null],
    queryFn: () => fetchPublicOpportunities({ category: "all" }),
    enabled: !!user && isProfileReadyForMatching(profileQuery.data ?? null),
    staleTime: 60_000,
  });

  const recs = useMemo(() => {
    if (!profileQuery.data || !oppQuery.data) return [];
    return rankOpportunities(oppQuery.data, profileQuery.data);
  }, [profileQuery.data, oppQuery.data]);

  if (authLoading || (user && (profileQuery.isLoading || oppQuery.isLoading))) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding your matches…
      </div>
    );
  }

  if (!user) {
    return (
      <Prompt
        title="Sign in for personalised matches"
        body="Create a free profile and we will rank opportunities by how well they fit your skills, education and goals."
        to="/signin"
        cta="Sign in"
      />
    );
  }

  if (!isProfileReadyForMatching(profileQuery.data ?? null)) {
    return (
      <Prompt
        title="Complete your profile to unlock recommendations"
        body="Add your opportunity goals, education level, country and at least one skill or interest so we can match you accurately."
        to="/profile"
        cta="Complete profile"
        icon
      />
    );
  }

  if (oppQuery.isError || profileQuery.isError) {
    return <p className="text-sm text-destructive">We could not load recommendations right now.</p>;
  }

  const shown = limit ? recs.slice(0, limit) : recs;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-display text-base font-bold text-foreground">No strong matches yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          New listings are added once our team has reviewed them. Updating your skills and
          interests can also widen your matches.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map(({ opportunity: o, score, reasons }) => (
        <article
          key={o.id}
          className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                categoryStyles[o.category],
              )}
            >
              {categoryLabel(o.category)}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <TrackOpportunityButton opportunityId={o.id} />
              <SaveOpportunityButton opportunityId={o.id} />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              {score}%
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-semibold text-muted-foreground">match</span>
          </div>

          <h3 className="mt-3 font-display text-[17px] font-bold leading-snug text-foreground">
            {o.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
            {o.organization}
          </p>

          {reasons.length > 0 && (
            <ul className="mt-3 space-y-1 text-[13px] text-foreground">
              {reasons.slice(0, 3).map((r) => (
                <li key={r} className="flex gap-2">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                  <span className="min-w-0">{r}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {locationLabel(o)}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDeadline(o.deadline)}
            </span>
          </div>

          <div className="mt-auto border-t border-border pt-4 [margin-top:1.25rem]">
            <Link
              to="/opportunities/$id"
              params={{ id: o.id }}
              className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-secondary/80"
            >
              View details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function Prompt({
  title,
  body,
  to,
  cta,
  icon,
}: {
  title: string;
  body: string;
  to: "/signin" | "/profile";
  cta: string;
  icon?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-base font-bold text-foreground">{title}</p>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{body}</p>
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {icon && <UserCog className="h-4 w-4" />}
        {cta}
      </Link>
    </div>
  );
}

export function RecommendedSection({ className }: { className?: string }) {
  return (
    <section className={className}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Recommended For You
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by fit with your skills, interests, education and location.
          </p>
        </div>
        <Link
          to="/recommended"
          className="inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:text-secondary/80"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <RecommendedOpportunities limit={3} />
    </section>
  );
}
