import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Globe2, MapPin, Search, ShieldAlert, University } from "lucide-react";
import {
  STARTER_UNIVERSITIES,
  filterUniversities,
  type UniversityType,
} from "@/lib/university-directory";

/**
 * Trailing `_` is intentional. Do not nest under the existing
 * scholarship-navigator.tsx page (it does not render an <Outlet />).
 * Public URL: /scholarship-navigator/universities
 */
export const Route = createFileRoute("/scholarship-navigator_/universities")({
  head: () => ({
    meta: [
      { title: "Global University Directory — ICK Opportunities" },
      { name: "description", content: "Explore a growing starter directory of Islamic universities and institutions offering Islamic studies. Not a list of confirmed open scholarships." },
      { property: "og:title", content: "Global University Directory — ICK Opportunities" },
    ],
  }),
  component: UniversityDirectoryPage,
});

const focusStyles = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function UniversityDirectoryPage() {
  const [keyword, setKeyword] = useState("");
  const [country, setCountry] = useState("all");
  const [type, setType] = useState<UniversityType | "all">("all");

  const countries = useMemo(() =>
    Array.from(new Map(STARTER_UNIVERSITIES.map((item) => [item.countryCode, item.country])).entries())
      .sort((a, b) => a[1].localeCompare(b[1])), []);
  const results = useMemo(() => filterUniversities({ keyword, country, type }), [keyword, country, type]);
  function resetFilters() { setKeyword(""); setCountry("all"); setType("all"); }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link to="/scholarship-navigator" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-secondary hover:underline ${focusStyles}`}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Scholarship Navigator
          </Link>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            <Globe2 aria-hidden="true" className="h-4 w-4 text-secondary" /> International university discovery · Starter directory
          </div>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Explore universities worldwide.</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Begin with Islamic universities and Islamic studies providers from different regions.
            This is a small, expanding, source-linked collection — not a complete global directory.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border px-3 py-1.5">{STARTER_UNIVERSITIES.length} starter institutions</span>
            <span className="rounded-full border border-border px-3 py-1.5">{countries.length} countries represented</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section aria-labelledby="directory-search-title" className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 id="directory-search-title" className="font-display text-xl font-bold">Find a university</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-3">
              <label htmlFor="university-keyword" className="mb-2 block text-sm font-semibold">Name, Arabic name, city or keyword</label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input id="university-keyword" type="search" autoComplete="off" maxLength={120} value={keyword}
                  onChange={(event) => setKeyword(event.target.value)} placeholder="e.g. Madinah, Niger, IIUM, الأزهر"
                  className={`min-h-12 w-full rounded-xl border border-input bg-background py-3 pl-11 pr-3 text-sm text-foreground placeholder:text-muted-foreground ${focusStyles}`} />
              </div>
            </div>
            <div className="md:col-span-1">
              <label htmlFor="university-country" className="mb-2 block text-sm font-semibold">Destination country</label>
              <select id="university-country" value={country} onChange={(event) => setCountry(event.target.value)}
                className={`min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground ${focusStyles}`}>
                <option value="all">All represented countries</option>
                {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="university-type" className="mb-2 block text-sm font-semibold">Institution category</label>
              <select id="university-type" value={type} onChange={(event) => setType(event.target.value as UniversityType | "all")}
                className={`min-h-12 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground ${focusStyles}`}>
                <option value="all">All starter institutions</option>
                <option value="islamic">Islamic institutional identity</option>
                <option value="islamic_studies">Islamic studies tradition / programmes</option>
              </select>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            These filters search only the starter list. Funding, current admission cycles, accreditation,
            degree availability and nationality eligibility are not confirmed here.
          </p>
        </section>

        <section aria-labelledby="university-results-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="university-results-heading" className="font-display text-xl font-bold">University directory</h2>
              <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">{results.length} of {STARTER_UNIVERSITIES.length} starter institutions shown</p>
            </div>
            <button type="button" onClick={resetFilters} className={`min-h-11 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted ${focusStyles}`}>
              Reset filters
            </button>
          </div>
          {results.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <Search aria-hidden="true" className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-4 font-display text-lg font-bold">No institutions in this starter list match</h3>
              <p className="mt-2 text-sm text-muted-foreground">This does not mean there are no universities in that country. Try resetting your filters.</p>
              <button type="button" onClick={resetFilters} className={`mt-5 min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground ${focusStyles}`}>Show all starter institutions</button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((item) => (
                <article key={item.slug} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"><MapPin aria-hidden="true" className="h-4 w-4" />{item.country}</span>
                  <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><University aria-hidden="true" className="h-6 w-6" /></span>
                  <h3 className="mt-4 font-display text-lg font-extrabold leading-snug">{item.name}</h3>
                  {item.location && <p className="mt-1 text-sm text-muted-foreground">{item.location}</p>}
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  {item.websiteVerification === "needs_review" && (
                    <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs font-semibold text-foreground">University website: verification pending</p>
                  )}
                  <p className="mt-5 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">Scholarship applications: not confirmed</p>
                  <Link to="/scholarship-navigator/universities/$slug" params={{ slug: item.slug }}
                    className={`mt-4 inline-flex min-h-11 items-center justify-between gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 ${focusStyles}`}>
                    View university profile <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-muted/40 p-6" aria-label="Using this directory safely">
          <div className="flex items-center gap-2"><BookOpen aria-hidden="true" className="h-5 w-5 text-secondary" /><h2 className="font-display text-lg font-bold">Before applying</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">An institution's appearance here does not mean it has a scholarship open today. Always check the university's official website for programmes, funding, deadlines and nationality rules.</p>
        </aside>
      </div>
    </div>
  );
    }
      
