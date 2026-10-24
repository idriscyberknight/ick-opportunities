import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, Globe2, GraduationCap, MapPin, ShieldAlert } from "lucide-react";
import { getUniversity } from "@/lib/university-directory";

/**
 * This trailing-underscore route is intentionally NOT nested under the
 * Scholarship Navigator or Directory page. Neither page contains <Outlet />.
 * Public URL: /scholarship-navigator/universities/:slug
 */
export const Route = createFileRoute("/scholarship-navigator_/universities_/$slug")({
  head: ({ params }) => {
    const item = getUniversity(params.slug);
    return { meta: [
      { title: item ? `${item.name} — ICK University Directory` : "University not found — ICK Opportunities" },
      { name: "description", content: item ? `Directory entry for ${item.name}. Website ownership and current admission or scholarship cycles may not be confirmed.` : "University directory entry unavailable." },
      ...(!item ? [{ name: "robots", content: "noindex" }] : []),
    ] };
  },
  component: UniversityProfilePage,
});

const focusStyles = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function UniversityProfilePage() {
  const { slug } = Route.useParams();
  const university = getUniversity(slug);
  if (!university) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">University entry not found</h1>
        <p className="mt-3 text-muted-foreground">This directory is expanding. The requested university may not be in the starter collection.</p>
        <Link to="/scholarship-navigator/universities" className={`mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground ${focusStyles}`}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to directory
        </Link>
      </section>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Link to="/scholarship-navigator/universities" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-secondary hover:underline ${focusStyles}`}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All universities
          </Link>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold">
            <Globe2 aria-hidden="true" className="h-4 w-4 text-secondary" /> Institution information · Directory beta
          </p>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{university.name}</h1>
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="h-4 w-4" />{university.location ? `${university.location}, ` : ""}{university.country}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{university.description}</p>
          {university.websiteVerification === "needs_review" && (
            <div role="status" className="mt-6 rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert aria-hidden="true" className="h-4 w-4 text-warning" /> Website verification pending
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{university.websiteReviewNote}</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {university.websiteVerification !== "needs_review" && (
              <a href={university.officialWebsite} target="_blank" rel="noopener noreferrer"
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 ${focusStyles}`}>
                Visit listed university website <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
            <Link to="/scholarship-navigator/global-search"
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold hover:bg-muted ${focusStyles}`}>
              Search universities &amp; scholarships <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link to="/scholarships" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold hover:bg-muted ${focusStyles}`}>
              All ICK scholarship listings <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold">Institution overview</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="font-semibold text-muted-foreground">Official name</dt><dd className="mt-1 text-foreground">{university.name}</dd></div>
              <div><dt className="font-semibold text-muted-foreground">Country</dt><dd className="mt-1 text-foreground">{university.country} ({university.countryCode})</dd></div>
              {university.location && <div><dt className="font-semibold text-muted-foreground">City / area</dt><dd className="mt-1 text-foreground">{university.location}</dd></div>}
              <div><dt className="font-semibold text-muted-foreground">Other names</dt><dd className="mt-1 text-foreground">{university.aliases.join(" · ") || "Not recorded"}</dd></div>
              <div><dt className="font-semibold text-muted-foreground">Directory categories</dt><dd className="mt-1 text-foreground">{university.types.map((t) => t === "islamic" ? "Islamic institutional identity" : "Islamic studies tradition / programmes").join(" · ")}</dd></div>
            </dl>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2"><GraduationCap aria-hidden="true" className="h-5 w-5 text-secondary" /><h2 className="font-display text-xl font-bold">Admissions & scholarships</h2></div>
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">Current scholarship status: not confirmed</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">No scholarship application cycle, deadline, funding amount or nationality eligibility has been verified for this institution in the ICK directory. Inclusion does not imply an open application. Global search may show unrelated listings; always check the provider's official announcement.</p>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{university.websiteVerification === "needs_review" ? "For current admissions and funding, seek a university contact through the independently listed sources before sharing documents or making payments." : "For current admissions, programmes and scholarships, consult the listed university website and verify application requirements."}</p>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2"><ShieldAlert aria-hidden="true" className="h-5 w-5 text-secondary" /><h2 className="font-display text-lg font-bold">Evidence & review</h2></div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Institutional information source was checked for the starter directory on <time dateTime={university.sourceCheckedOn}>{university.sourceCheckedOn}</time>.</p>
            <p className="mt-3 text-sm text-muted-foreground">This is not an accreditation check or a verification of open scholarships.</p>
            <a href={university.institutionalSource} target="_blank" rel="noopener noreferrer"
              className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-secondary hover:underline ${focusStyles}`}>
              View institutional source <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
            {university.additionalInstitutionalSources?.map((source) => (
              <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
                className={`mt-3 flex min-h-11 items-center gap-2 text-sm font-semibold text-secondary hover:underline ${focusStyles}`}>
                {source.label} <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            ))}
          </section>
          <section className="rounded-2xl border border-border bg-muted/40 p-6">
            <h2 className="font-display text-lg font-bold">Safety checklist</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Confirm programme availability, current admissions, nationality requirements, scholarship coverage and official deadlines before applying.</p>
          </section>
        </aside>
      </div>
    </div>
  );
      }
