import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap } from "lucide-react";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Scholarships — ICK Opportunities";
const description =
  "Scholarship listings and official university information for students in Nigeria and beyond. Check provider requirements before applying.";

export const Route = createFileRoute("/scholarships")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScholarshipsPage,
});

function ScholarshipsPage() {
  return (
    <>
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-9 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
              <GraduationCap aria-hidden="true" className="h-4 w-4" /> New · Scholarship Navigator Beta
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold text-foreground sm:text-2xl">
              Explore Islamic universities and global scholarship sources
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Find official university information and explore reviewed ICK listings when available.
              Application availability must be confirmed with each provider.
            </p>
          </div>
          <Link
            to="/scholarship-navigator"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Open Scholarship Navigator <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
      <OpportunityBrowser
        fixedCategory="scholarship"
        title="Scholarships"
        intro="Funding for undergraduate, postgraduate and research study. Always check the official source, eligibility and current deadline before applying."
      />
    </>
  );
}
