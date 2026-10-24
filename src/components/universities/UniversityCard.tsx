import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, MapPin, ShieldAlert } from "lucide-react";
import type { UniversityRecord } from "@/lib/university-directory";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Shared editorial card; never imply that accreditation or open funding was verified. */
export function UniversityCard({ university }: { university: UniversityRecord }) {
  const websiteNeedsReview = university.websiteVerification === "needs_review";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      <div className="border-b border-border bg-gradient-to-br from-secondary/10 via-card to-muted/70 px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-secondary shadow-sm">
            <Building2 className="h-6 w-6" />
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Institution profile
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-secondary" />{university.country}
          </span>
          <span className={websiteNeedsReview
            ? "inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-foreground"
            : "inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"}>
            {websiteNeedsReview && <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />}
            {websiteNeedsReview ? "Website check pending" : "Institution source recorded"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-xl font-extrabold leading-snug tracking-tight text-foreground">
          {university.name}
        </h3>
        {university.location && (
          <p className="mt-2 text-sm font-medium text-muted-foreground">{university.location}</p>
        )}
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
          {university.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Directory categories">
          {university.types.includes("islamic") && (
            <span className="rounded-md bg-secondary/10 px-2.5 py-1 text-xs font-medium text-foreground">Islamic university</span>
          )}
          {university.types.includes("islamic_studies") && (
            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">Islamic studies</span>
          )}
        </div>
        <div className="mt-5 space-y-3 border-t border-border pt-5">
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-sm font-semibold text-foreground">Scholarship availability: unconfirmed</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              No current application cycle is established by this directory.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Source recorded <time dateTime={university.sourceCheckedOn}>{university.sourceCheckedOn}</time> · Not an accreditation review
          </p>
          <Link to="/scholarship-navigator/universities/$slug" params={{ slug: university.slug }}
            className={`inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 ${focusRing}`}>
            View university profile <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
          </Link>
        </div>
      </div>
    </article>
  );
}
