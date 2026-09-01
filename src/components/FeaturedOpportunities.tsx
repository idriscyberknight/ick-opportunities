import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Building2 } from "lucide-react";
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

export function FeaturedOpportunities() {
  return (
    <section className="w-full bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Featured Opportunities
            </h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Hand-picked openings to get you started. These are placeholder
              listings for the foundation preview.
            </p>
          </div>
          <Link
            to="/opportunities"
            className="inline-flex items-center gap-1 text-sm font-medium text-secondary transition-colors hover:text-secondary/90"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => (
            <article
              key={opportunity.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    typeStyles[opportunity.type]
                  )}
                >
                  {typeLabels[opportunity.type]}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {opportunity.deadline}
                </span>
              </div>

              <h3 className="mt-4 font-display text-lg font-semibold leading-snug text-foreground">
                {opportunity.title}
              </h3>

              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {opportunity.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {opportunity.organization}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {opportunity.location}
                </span>
              </div>

              <div className="mt-auto pt-5">
                <Link
                  to="/opportunities"
                  className="inline-flex items-center gap-1 text-sm font-medium text-secondary transition-colors group-hover:underline"
                >
                  View details
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
