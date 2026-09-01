import { ShieldCheck, FileCheck, Search, AlertCircle } from "lucide-react";

const trustPoints = [
  {
    icon: Search,
    title: "Sourced from official channels",
    description:
      "We pull opportunities directly from government portals, embassy pages, company career sites, and verified funders.",
  },
  {
    icon: FileCheck,
    title: "Cross-checked before listing",
    description:
      "Every opportunity is reviewed against the original source link, deadline, and eligibility requirements.",
  },
  {
    icon: ShieldCheck,
    title: "No pay-to-apply schemes",
    description:
      "We flag opportunities that ask for suspicious upfront fees and prioritize programmes with transparent processes.",
  },
  {
    icon: AlertCircle,
    title: "Community reporting",
    description:
      "Users can report outdated or suspicious listings so the platform stays accurate and trustworthy.",
  },
];

export function TrustSection() {
  return (
    <section className="w-full bg-card py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Verified. Trustworthy. Built for You.
          </h2>
          <p className="mt-3 text-muted-foreground">
            We believe opportunity discovery should feel safe, not scammy. Here is
            how we plan to keep listings reliable as ICK Opportunities grows.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <div
              key={point.title}
              className="rounded-xl border border-border bg-background p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <point.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
