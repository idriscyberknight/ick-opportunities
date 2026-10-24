import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  GraduationCap,
  MapPin,
  Search,
  ShieldAlert,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  formatDeadline,
  type Opportunity,
} from "@/lib/opportunities";

import {
  STARTER_UNIVERSITIES,
  normalizeUniversityTerm,
} from "@/lib/university-directory";

/**
 * ICK Opportunities
 * Global Scholarship Search — Limited Beta
 *
 * READ-ONLY IMPLEMENTATION
 *
 * Universities:
 * Uses the existing eight editorial starter records.
 *
 * Scholarships:
 * Uses existing published scholarship records.
 *
 * This is not a complete international scholarship database.
 *
 * No database migrations.
 * No authentication changes.
 * No automatic publication.
 *
 * Database RLS must be verified independently.
 */

export const Route = createFileRoute(
  "/scholarship-navigator_/global-search"
)({
  head: () => ({
    meta: [
      {
        title:
          "Global Scholarship Search Beta — ICK Opportunities",
      },
      {
        name: "description",
        content:
          "Explore selected universities and published scholarship listings through ICK Opportunities.",
      },
      {
        name: "robots",
        content: "noindex, nofollow",
      },
    ],
  }),

  component: GlobalSearchBeta,
});

type SearchCategory =
  | "all"
  | "universities"
  | "scholarships";

type ScholarshipCard = Pick<
  Opportunity,
  | "id"
  | "title"
  | "organization"
  | "country"
  | "description"
  | "deadline"
>;

const focusRing =
  "focus-visible:outline-none " +
  "focus-visible:ring-2 " +
  "focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-background";

function todayLocalISO(): string {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Read only existing published scholarship records.
 *
 * Frontend filtering does not replace database RLS.
 */
async function fetchPublishedScholarships(): Promise<
  ScholarshipCard[]
> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id,title,organization,country,description,deadline"
    )
    .eq("category", "scholarship")
    .eq("status", "active")
    .eq("verified_status", "verified")
    .not("published_at", "is", null)
    .or(
      `deadline.is.null,deadline.gte.${todayLocalISO()}`
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Normalize keyword search.
 */
function matches(
  values: Array<string | null | undefined>,
  term: string
): boolean {
  if (!term) {
    return true;
  }

  const text = values
    .filter(Boolean)
    .join(" ");

  return normalizeUniversityTerm(
    text
  ).includes(term);
}

/**
 * Global Search Interface
 */
function GlobalSearchBeta() {
  const [keyword, setKeyword] = useState("");

  const [country, setCountry] = useState("all");

  const [category, setCategory] =
    useState<SearchCategory>("all");

  /**
   * Load approved scholarship candidates.
   */
  const {
    data: scholarships = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "ick",
      "global-scholarship-search",
      "beta-v1",
    ],

    queryFn: fetchPublishedScholarships,

    staleTime: 60_000,
  });

  /**
   * Build destination options from available data.
   */
  const countries = useMemo(() => {
    const universityCountries =
      STARTER_UNIVERSITIES.map(
        (university) => university.country
      );

    const scholarshipCountries =
      scholarships
        .map((scholarship) => scholarship.country)
        .filter(
          (value): value is string =>
            Boolean(value)
        );

    return Array.from(
      new Set([
        ...universityCountries,
        ...scholarshipCountries,
      ])
    ).sort((a, b) => a.localeCompare(b));
  }, [scholarships]);

  /**
   * Normalize user keyword.
   */
  const term = normalizeUniversityTerm(
    keyword.trim()
  );

  /**
   * Filter university starter collection.
   */
  const universities = useMemo(() => {
    if (category === "scholarships") {
      return [];
    }

    return STARTER_UNIVERSITIES.filter(
      (university) => {
        const matchesCountry =
          country === "all" ||
          university.country === country;

        const matchesKeyword = matches(
          [
            university.name,
            ...university.aliases,
            university.country,
            university.location,
            university.description,
          ],
          term
        );

        return (
          matchesCountry &&
          matchesKeyword
        );
      }
    );
  }, [category, country, term]);

  /**
   * Filter published scholarship records.
   */
  const results = useMemo(() => {
    if (category === "universities") {
      return [];
    }

    return scholarships.filter(
      (scholarship) => {
        const matchesCountry =
          country === "all" ||
          scholarship.country === country;

        const matchesKeyword = matches(
          [
            scholarship.title,
            scholarship.organization,
            scholarship.country,
            scholarship.description,
          ],
          term
        );

        return (
          matchesCountry &&
          matchesKeyword
        );
      }
    );
  }, [
    category,
    country,
    term,
    scholarships,
  ]);

  /**
   * Reset all filters.
   */
  function resetFilters() {
    setKeyword("");
    setCountry("all");
    setCategory("all");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* PAGE HEADER */}

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

          <Link
            to="/scholarship-navigator"
            className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary hover:underline ${focusRing}`}
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-4 w-4"
            />

            Scholarship Navigator
          </Link>

          <p className="mt-5 inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
            ICK Global Search · Limited Beta
          </p>

          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Search universities and scholarships
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Explore selected universities and ICK
            scholarship records currently marked
            as published.
            Universities and scholarships are
            separate result types.
            A university listing does not mean
            funding is currently available.
          </p>

        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">

        {/* SEARCH FILTERS */}

        <section
          className="rounded-2xl border border-border bg-card p-4 sm:p-6"
          aria-label="Global search filters"
        >

          <label
            htmlFor="ick-global-keyword"
            className="block text-sm font-semibold"
          >
            University, scholarship, organization
            or country
          </label>

          <div className="relative mt-2">

            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            />

            <input
              id="ick-global-keyword"
              type="search"
              autoComplete="off"
              maxLength={120}
              value={keyword}
              onChange={(event) =>
                setKeyword(event.target.value)
              }
              placeholder="Madinah, IIUM, Niger, Erasmus, الأزهر"
              className={`min-h-12 w-full rounded-xl border border-input bg-background py-3 pl-11 pr-3 text-sm ${focusRing}`}
            />

          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            {/* RESULT TYPE */}

            <div>

              <label
                htmlFor="ick-global-category"
                className="block text-sm font-semibold"
              >
                Result type
              </label>

              <select
                id="ick-global-category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value as SearchCategory
                  )
                }
                className={`mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm ${focusRing}`}
              >

                <option value="all">
                  Universities and scholarships
                </option>

                <option value="universities">
                  Universities only
                </option>

                <option value="scholarships">
                  Scholarships only
                </option>

              </select>

            </div>

            {/* COUNTRY FILTER */}

            <div>

              <label
                htmlFor="ick-global-country"
                className="block text-sm font-semibold"
              >
                Destination country
              </label>

              <select
                id="ick-global-country"
                value={country}
                onChange={(event) =>
                  setCountry(event.target.value)
                }
                className={`mt-2 min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm ${focusRing}`}
              >

                <option value="all">
                  All represented countries
                </option>

                {countries.map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ))}

              </select>

            </div>

          </div>

          <button
            type="button"
            onClick={resetFilters}
            className={`mt-4 min-h-11 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted ${focusRing}`}
          >
            Reset filters
          </button>

        </section>

        {/* SECURITY AND SCOPE NOTICE */}

        <aside className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">

          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />

          <p>
            This beta searches only eight editorial
            institution records and up to 100
            recently created published scholarship
            records.

            It does not search all global universities,
            independently verify eligibility, or
            confirm application cycles.

            Database security must be reviewed
            independently of frontend filters.
          </p>

        </aside>

        {/* RESULT COUNT */}

        <p
          aria-live="polite"
          className="text-sm font-semibold text-muted-foreground"
        >

          {universities.length} university results

          {" · "}

          {isPending
            ? "Scholarships loading"
            : isError
              ? "Scholarships unavailable"
              : `${results.length} scholarship results`
          }

        </p>

        {/* UNIVERSITY RESULTS */}

        {category !== "scholarships" && (

          <section aria-labelledby="ick-university-heading">

            <h2
              id="ick-university-heading"
              className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"
            >

              <GraduationCap
                aria-hidden="true"
                className="h-6 w-6 text-secondary"
              />

              Universities

            </h2>

            {universities.length === 0 ? (

              <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No institution in this limited
                starter directory matches your
                filters.
              </p>

            ) : (

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {universities.map((university) => (

                  <article
                    key={university.slug}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5"
                  >

                    <p className="flex items-center gap-1 text-xs text-muted-foreground">

                      <MapPin
                        aria-hidden="true"
                        className="h-4 w-4"
                      />

                      {university.country}

                    </p>

                    <h3 className="mt-3 font-display text-lg font-bold">
                      {university.name}
                    </h3>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {university.description}
                    </p>

                    {university.websiteVerification === "needs_review" && (
                      <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs font-semibold text-foreground">University website verification pending.</p>
                    )}
                    <p className="mt-4 text-xs text-muted-foreground">
                      Editorial institution entry.
                      Current scholarship status unknown.
                    </p>

                    <Link
                      to="/scholarship-navigator/universities/$slug"
                      params={{
                        slug: university.slug,
                      }}
                      className={`mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary hover:underline ${focusRing}`}
                    >

                      View university profile

                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4"
                      />

                    </Link>

                  </article>

                ))}

              </div>

            )}

          </section>

        )}

        {/* SCHOLARSHIP RESULTS */}

        {category !== "universities" && (

          <section aria-labelledby="ick-scholarship-heading">

            <h2
              id="ick-scholarship-heading"
              className="flex items-center gap-2 font-display text-xl font-bold sm:text-2xl"
            >

              <BookOpen
                aria-hidden="true"
                className="h-6 w-6 text-secondary"
              />

              Published scholarship records

            </h2>

            {isPending ? (

              <p
                role="status"
                className="mt-4 text-sm text-muted-foreground"
              >
                Loading scholarship records…
              </p>

            ) : isError ? (

              <div
                role="alert"
                className="mt-4 rounded-xl border border-destructive/40 p-5 text-sm"
              >

                <p>
                  Scholarships could not be loaded.
                  University browsing is still available.
                </p>

                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="mt-3 min-h-11 rounded-lg border px-4 font-semibold"
                >
                  Try again
                </button>

              </div>

            ) : results.length === 0 ? (

              <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No matching published scholarship
                records are available in this
                limited beta.

                This does not mean that no
                scholarships exist.
              </p>

            ) : (

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                {results.map((scholarship) => (

                  <article
                    key={scholarship.id}
                    className="flex flex-col rounded-2xl border border-border bg-card p-5"
                  >

                    <p className="text-xs font-semibold text-muted-foreground">
                      {scholarship.organization}
                    </p>

                    <h3 className="mt-3 font-display text-lg font-bold">
                      {scholarship.title}
                    </h3>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {scholarship.country ||
                        "Destination unspecified"}
                    </p>

                    <p className="mt-3 flex-1 text-sm text-muted-foreground">

                      Deadline:{" "}

                      {formatDeadline(
                        scholarship.deadline
                      )}

                    </p>

                    <Link
                      to="/opportunities/$id"
                      params={{
                        id: scholarship.id,
                      }}
                      className={`mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary hover:underline ${focusRing}`}
                    >

                      View ICK listing

                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4"
                      />

                    </Link>

                  </article>

                ))}

              </div>

            )}

          </section>

        )}

      </div>

    </div>
  );
    }
