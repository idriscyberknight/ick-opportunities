import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";

import { SearchSection } from "./SearchSection";

const journey = ["Discover", "Match", "Prepare", "Apply"];

const stats = [
  { value: "4", label: "Opportunity categories" },
  { value: "100%", label: "Official source links" },
  { value: "Daily", label: "Listing reviews" },
];

export function Hero() {
  return (
    <section className="relative w-full overflow-hidden border-b border-border bg-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--secondary)_10%,transparent),transparent)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Verified, Nigeria-first opportunities
          </span>

          <h1 className="mt-6 font-display text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[3.75rem]">
            Find Opportunities.
            <br className="hidden sm:block" /> Build Your Future.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Discover scholarships, jobs, internships and grants matched to your
            goals — and get the tools you need to apply with confidence.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/opportunities"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Find Opportunities
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/get-started"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3.5 text-[15px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <FileText className="h-4 w-4" />
              Build My CV
            </Link>
          </div>

          <ol className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {journey.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span>{step}</span>
                {i < journey.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-border" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-10 max-w-5xl sm:mt-12">
          <SearchSection />
        </div>

        <dl className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-display text-2xl font-extrabold tracking-tight text-foreground">
                  {stat.value}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
