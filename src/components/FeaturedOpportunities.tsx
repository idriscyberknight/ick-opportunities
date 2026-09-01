import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const opportunities = [
  {
    id: "1",
    type: "scholarship",
    title: "Federal Government BEA Scholarship",
    organization: "Federal Ministry of Education",
    location: "Nigeria / Abroad",
    deadline: "30 Sep 2026",
    description:
      "Bilateral Education Agreement scholarship for Nigerian undergraduates and postgraduates to study overseas.",
    verified: true,
  },
  {
    id: "2",
    type: "job",
    title: "Junior Software Engineer",
    organization: "Lagos Fintech Startup",
    location: "Lagos / Hybrid",
    deadline: "Open until filled",
    description:
      "Entry-level engineering role for graduates with strong problem-solving skills and a passion for fintech.",
    verified: true,
  },
  {
    id: "3",
    type: "internship",
    title: "Data Science Intern",
    organization: "Nigerian AI Collective",
    location: "Remote",
    deadline: "15 Oct 2026",
    description:
      "Three-month remote internship focused on machine learning, data pipelines, and real-world projects.",
    verified: true,
  },
  {
    id: "4",
    type: "grant",
    title: "Youth Innovation Fund",
    organization: "National Youth Council",
    location: "Nigeria",
    deadline: "20 Nov 2026",
    description:
      "Seed grant for young Nigerian entrepreneurs with early-stage business ideas solving local problems.",
    verified: true,
  },
  {
    id: "5",
    type: "scholarship",
    title: "PTDF Overseas Scholarship",
    organization: "Petroleum Technology Development Fund",
    location: "Abroad",
    deadline: "5 Oct 2026",
    description:
      "Fully funded MSc and PhD scholarships in oil and gas related disciplines at selected universities.",
    verified: true,
  },
  {
    id: "6",
    type: "job",
    title: "Graduate Management Trainee",
    organization: "Pan-African Bank",
    location: "Abuja / Lagos",
    deadline: "12 Oct 2026",
    description:
      "Rotational programme for fresh graduates interested in banking, operations, and corporate strategy.",
    verified: false,
  },
];

const typeLabels: Record<string, string> = {
  scholarship: "Scholarship",
  job: "Job",
  internship: "Internship",
  grant: "Grant",
};

const typeStyles: Record<string, string> = {
  scholarship: "bg-secondary/10 text-secondary",
  job: "bg-primary/10 text-primary",
  internship: "bg-muted text-muted-foreground",
  grant: "bg-success/10 text-success",
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function FeaturedOpportunities() {
  return (
    <section className="w-full bg-background py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
              Featured
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground sm:text-3xl">
              Opportunities worth your attention
            </h2>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              A curated snapshot across scholarships, jobs, internships and
              grants. Sample listings shown during the preview.
            </p>
          </div>
          <Link
            to="/opportunities"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => (
            <article
              key={opportunity.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-[0_18px_40px_-28px_rgba(16,24,40,0.45)]"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-sm font-bold text-primary">
                  {initials(opportunity.organization)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {opportunity.organization}
                    </p>
                    {opportunity.verified && (
                      <BadgeCheck
                        className="h-4 w-4 shrink-0 text-success"
                        aria-label="Verified source"
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold",
                      typeStyles[opportunity.type]
                    )}
                  >
                    {typeLabels[opportunity.type]}
                  </span>
                </div>
              </div>

              <h3 className="mt-4 font-display text-[17px] font-bold leading-snug tracking-[-0.01em] text-foreground">
                {opportunity.title}
              </h3>

              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {opportunity.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {opportunity.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {opportunity.deadline}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs font-medium text-muted-foreground">
                  {opportunity.verified ? "Verified source" : "Pending review"}
                </span>
                <Link
                  to="/opportunities"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  View details
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
