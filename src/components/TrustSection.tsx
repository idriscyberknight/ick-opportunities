import { Link } from "@tanstack/react-router";
import { ShieldCheck, FileCheck, Search, Clock, ArrowRight } from "lucide-react";

const trustPoints = [
  {
    icon: FileCheck,
    title: "Reviewed before publishing",
    description:
      "Listings found by our discovery tools stay in draft until a member of our team reviews them. Nothing is published automatically.",
  },
  {
    icon: Search,
    title: "A source link on every listing",
    description:
      "Each listing shows the page it came from. Always confirm the deadline and requirements there before you apply.",
  },
  {
    icon: ShieldCheck,
    title: "Never pay to apply",
    description:
      "Be careful with any opportunity that asks for money to apply or to secure a place. ICK Opportunities never asks applicants for fees.",
  },
  {
    icon: Clock,
    title: "Details can change",
    description:
      "Deadlines and requirements can change after a listing is reviewed. The source page always has the final word.",
  },
];

export function TrustSection() {
  return (
    <section className="w-full bg-card py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="max-w-md">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-success">
              Trust &amp; safety
            </span>
            <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-foreground sm:text-3xl">
              Reviewed opportunities, with links to their sources
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Opportunity scams are common. ICK Opportunities exists to make the
              search safer: our team reviews what we publish, and every listing
              links to its source page so you can check the details yourself
              before you apply.
            </p>
            <Link
              to="/opportunities"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Browse opportunities
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {trustPoints.map((point) => (
              <div key={point.title} className="bg-card p-6">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success">
                  <point.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-[15px] font-bold text-foreground">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
