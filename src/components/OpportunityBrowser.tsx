import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CalendarDays, Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  categoryLabel,
  categoryStyles,
  fetchPublicOpportunities,
  formatDeadline,
  locationLabel,
  type OpportunityCategory,
} from "@/lib/opportunities";

const fieldClass =
  "w-full appearance-none rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/15";

export function OpportunityBrowser({
  fixedCategory,
  title,
  intro,
}: {
  fixedCategory?: OpportunityCategory;
  title: string;
  intro: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OpportunityCategory | "all">(
    fixedCategory ?? "all",
  );
  const [country, setCountry] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["opportunities", "public", fixedCategory ?? null],
    queryFn: () => fetchPublicOpportunities({ category: fixedCategory ?? "all" }),
  });

  const countries = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((o) => o.country && set.add(o.country));
    return Array.from(set).sort();
  }, [data]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (category !== "all" && o.category !== category) return false;
      if (country !== "all" && o.country !== country) return false;
      if (!term) return true;
      return [o.title, o.organization, o.description, o.eligibility]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [data, search, category, country]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{intro}</p>
      </header>

      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <label htmlFor="opp-search" className="sr-only">
            Search opportunities
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="opp-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, organisation or keyword"
            className={fieldClass}
          />
        </div>

        {!fixedCategory && (
          <div className="relative">
            <label htmlFor="opp-category" className="sr-only">
              Category
            </label>
            <select
              id="opp-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as OpportunityCategory | "all")}
              className={cn(fieldClass, "pl-3")}
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative">
          <label htmlFor="opp-country" className="sr-only">
            Country
          </label>
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            id="opp-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={fieldClass}
          >
            <option value="all">Any country</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading opportunities…
        </div>
      ) : isError ? (
        <p className="mt-12 text-sm text-destructive">
          We could not load opportunities right now. Please try again shortly.
        </p>
      ) : results.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-lg font-bold text-foreground">
            No opportunities published yet
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Verified listings appear here as soon as they are published.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "opportunity" : "opportunities"}
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((o) => (
              <article
                key={o.id}
                className="group flex min-w-0 flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,0.45)]"
              >
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
