import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Globe2,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDeadline, type Opportunity } from "@/lib/opportunities";

export const Route = createFileRoute("/scholarship-navigator")({
  head: () => ({
    meta: [
      { title: "Scholarship Navigator — ICK Opportunities" },
      {
        name: "description",
        content:
          "Explore Islamic universities, European scholarship sources, and ICK's reviewed scholarship listings. Always check official requirements.",
      },
      { property: "og:title", content: "Scholarship Navigator — ICK Opportunities" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ScholarshipNavigatorPage,
});

type Region = "all" | "islamic" | "europe";

type OfficialResource = {
  name: string;
  location: string;
  region: Exclude<Region, "all">;
  description: string;
  href: string;
};

// Institutional and programme information pages, NOT claims of an open scholarship.
// These links must be maintained by the ICK editorial team.
const OFFICIAL_RESOURCES: OfficialResource[] = [
  {
    name: "Islamic University of Madinah",
    location: "Saudi Arabia",
    region: "islamic",
    description: "University admission and registration information.",
    href: "https://iu.edu.sa/en-us/Deanship-Admission-Registration",
  },
  {
    name: "Al-Azhar — International Students",
    location: "Egypt",
    region: "islamic",
    description: "Official guidance and scholarship information for international students.",
    href: "https://azhar.eg/foreignstudent/en/Enrollment-and-Registration",
  },
  {
    name: "International Islamic University Malaysia",
    location: "Malaysia",
    region: "islamic",
    description: "Official admissions and programme information.",
    href: "https://www.iium.edu.my/admissions/",
  },
  {
    name: "Erasmus Mundus Joint Masters",
    location: "Europe (multiple destinations)",
    region: "europe",
    description: "European Commission programme information and course search.",
    href: "https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters",
  },
  {
    name: "DAAD Scholarships",
    location: "Germany",
    region: "europe",
    description: "Official German scholarship information and funding database guidance.",
    href: "https://www.daad.de/en/studying-in-germany/scholarships/daad-scholarships/",
  },
];

const REGION_OPTIONS: Array<{
  value: Region;
  title: string;
  description: string;
}> = [
  { value: "all", title: "All scholarships", description: "Global opportunities" },
  { value: "islamic", title: "Islamic universities", description: "University starting points" },
  { value: "europe", title: "European scholarships", description: "European funding sources" },
];

const EUROPEAN_COUNTRIES = new Set([
  "austria", "belgium", "denmark", "finland", "france", "germany", "greece",
  "ireland", "italy", "netherlands", "norway", "poland", "portugal", "spain",
  "sweden", "switzerland", "united kingdom", "uk", "europe", "european union",
]);

const ISLAMIC_INSTITUTION_NAMES = [
  "islamic university of madinah",
  "islamic university of medinah",
  "al-azhar",
  "al azhar",
  "international islamic university malaysia",
  "iium",
];

function isFromRegion(opportunity: Opportunity, region: Region): boolean {
  if (region === "all") return true;
  const name = `${opportunity.title} ${opportunity.organization}`.toLowerCase();
  if (region === "islamic") {
    return ISLAMIC_INSTITUTION_NAMES.some((namePart) => name.includes(namePart));
  }
  const country = opportunity.country?.toLowerCase().trim() ?? "";
  return EUROPEAN_COUNTRIES.has(country) || /erasmus|daad|european union|european commission/.test(name);
}

function localDateISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function fetchReviewedScholarships(): Promise<Opportunity[]> {
  // Apply visibility criteria explicitly even when an admin is signed in.
  // RLS must independently enforce public access at the database level.
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("category", "scholarship")
    .eq("status", "active")
    .eq("verified_status", "verified")
    .not("published_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).filter((opportunity) =>
    !opportunity.deadline || opportunity.deadline >= localDateISO(),
  );
}

function ScholarshipNavigatorPage() {
  const [region, setRegion] = useState<Region>("all");
  const [keyword, setKeyword] = useState("");
  const [destination, setDestination] = useState("all");
  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ["scholarship-navigator", "reviewed-scholarships", "v1"],
    queryFn: fetchReviewedScholarships,
    staleTime: 60_000,
  });

  const destinations = useMemo(
    () => Array.from(new Set([
      ...OFFICIAL_RESOURCES.map((item) => item.location),
      ...data.map((item) => item.country).filter((v): v is string => !!v),
    ])).sort(),
    [data],
  );

  const term = keyword.trim().toLowerCase();
  const visibleResources = OFFICIAL_RESOURCES.filter((resource) => {
    if (region !== "all" && resource.region !== region) return false;
    if (destination !== "all" && resource.location !== destination) return false;
    return !term || [resource.name, resource.location, resource.description]
      .some((text) => text.toLowerCase().includes(term));
  });

  const visibleScholarships = data.filter((opportunity) => {
    if (!isFromRegion(opportunity, region)) return false;
    if (destination !== "all" && opportunity.country !== destination) return false;
    return !term || [
      opportunity.title,
      opportunity.organization,
      opportunity.country,
      opportunity.description,
    ].filter(Boolean).some((text) => text!.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            <GraduationCap aria-hidden="true" className="h-4 w-4 text-secondary" />
            ICK Scholarship Navigator · Beta
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Explore universities. Find scholarship opportunities.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Begin with Islamic universities, European scholarship programmes and global funding.
            Browse official information, then check reviewed ICK listings when available.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#navigator-search" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Find a scholarship <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <Link to="/scholarships" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              All scholarship listings
            </Link>
          <Link
  to="/scholarship-navigator/universities"
  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Explore University Directory
  <ArrowRight aria-hidden="true" className="h-4 w-4" />
</Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <section aria-labelledby="path-heading">
          <h2 id="path-heading" className="font-display text-xl font-bold sm:text-2xl">Choose where to explore</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            These browse categories are guides, not proof that a scholarship is accepting applications.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {REGION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={region === option.value}
                onClick={() => { setRegion(option.value); setDestination("all"); }}
                className={`min-h-24 rounded-xl border p-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${region === option.value ? "border-secondary bg-secondary/10" : "border-border bg-card hover:bg-muted"}`}
              >
                <span className="block font-display text-base font-bold">{option.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="search-heading" id="navigator-search">
          <h2 id="search-heading" className="font-display text-xl font-bold sm:text-2xl">Search the navigator</h2>
          <div className="mt-5 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 sm:p-6">
            <div>
              <label htmlFor="scholarship-keyword" className="mb-2 block text-sm font-semibold">University, programme or keyword</label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="scholarship-keyword"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="e.g. Madinah, Erasmus, engineering"
                  className="min-h-11 w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                />
              </div>
            </div>
            <div>
              <label htmlFor="scholarship-destination" className="mb-2 block text-sm font-semibold">Institution location / listing destination</label>
              <select
                id="scholarship-destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="all">All destinations</option>
                {destinations.map((place) => <option key={place} value={place}>{place}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            This first version searches official resource cards and a limited set of published ICK records.
            Nationality, course eligibility and current admission cycles are not verified by this search.
          </p>
        </section>

        <section aria-labelledby="resources-heading">
          <div className="flex items-center gap-3">
            <Globe2 aria-hidden="true" className="h-5 w-5 text-secondary" />
            <h2 id="resources-heading" className="font-display text-xl font-bold sm:text-2xl">Official starting points</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            These are information sources, not confirmed open scholarships. Always check dates, funding and eligibility on each provider's site.
          </p>
          {visibleResources.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No official resource cards match these filters. Try a different search.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleResources.map((resource) => (
                <article key={resource.href} className="flex flex-col rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <MapPin aria-hidden="true" className="h-4 w-4" />{resource.location}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold">{resource.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{resource.description}</p>
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Scholarship application status: not confirmed here
                  </p>
                  <a href={resource.href} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    Visit official source <ExternalLink aria-hidden="true" className="h-4 w-4" />
                    <span className="sr-only">(opens a new tab)</span>
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="listings-heading">
          <div className="flex items-center gap-3">
            <BookOpen aria-hidden="true" className="h-5 w-5 text-secondary" />
            <h2 id="listings-heading" className="font-display text-xl font-bold sm:text-2xl">Reviewed ICK scholarship listings</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Only published, verified-status scholarship records appear here. Final application requirements come from the provider.
          </p>

          {isPending ? (
            <p className="mt-6 text-sm text-muted-foreground" role="status">Loading scholarship records…</p>
          ) : isError ? (
            <div className="mt-5 rounded-xl border border-destructive/40 bg-card p-5">
              <p className="text-sm text-destructive" role="alert">Scholarship listings could not be loaded.</p>
              <button type="button" onClick={() => void refetch()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">
                <RefreshCw aria-hidden="true" className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : visibleScholarships.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <ShieldCheck aria-hidden="true" className="mx-auto h-8 w-8 text-success" />
              <h3 className="mt-4 font-display text-lg font-bold">No matching published scholarships</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                There are no published ICK listings matching these filters at the moment.
                You can still consult the official resources above. This does not mean applications are closed everywhere.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-5 text-sm text-muted-foreground" role="status">
                {visibleScholarships.length} matching listing{visibleScholarships.length === 1 ? "" : "s"} within the current result set
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleScholarships.map((opportunity) => (
                  <article key={opportunity.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
                    <span className="w-fit rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">Reviewed record</span>
                    <h3 className="mt-3 font-display text-lg font-bold leading-snug">{opportunity.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{opportunity.organization}</p>
                    <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                      <p className="flex items-center gap-2"><MapPin aria-hidden="true" className="h-4 w-4" />{opportunity.country || "Destination not specified"}</p>
                      <p className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="h-4 w-4" />{formatDeadline(opportunity.deadline)}</p>
                    </div>
                    <Link to="/opportunities/$id" params={{ id: opportunity.id }} className="mt-5 inline-flex min-h-11 items-center gap-2 border-t border-border pt-3 text-sm font-semibold text-secondary hover:underline">
                      Check listing details <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </article>
                ))}
              </div>
              {data.length >= 200 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  This beta searches only the newest 200 eligible records; further pagination is planned.
                </p>
              )}
            </>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-muted/50 p-5 sm:p-7" aria-labelledby="guidance-heading">
          <h2 id="guidance-heading" className="font-display text-lg font-bold">Before applying</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Confirm the current admission cycle, nationality rules, academic qualifications,
            funding and application deadline directly with the university or scholarship provider.
            ICK Opportunities is not an official admissions agent and cannot guarantee eligibility or admission.
          </p>
        </aside>
      </div>
    </div>
  );
      }
