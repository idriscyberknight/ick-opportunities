import { Compass, Sparkles, FileText, Send, LineChart } from "lucide-react";

const steps = [
  {
    icon: Compass,
    title: "Discover",
    description:
      "Browse scholarships, jobs, internships and grants sourced from official Nigerian and international channels.",
  },
  {
    icon: Sparkles,
    title: "Match",
    description:
      "Filter by field, level, location and deadline so you only see opportunities you are genuinely eligible for.",
  },
  {
    icon: FileText,
    title: "Prepare",
    description:
      "Build a strong CV and application materials with structured guidance and requirement checklists.",
  },
  {
    icon: Send,
    title: "Apply",
    description:
      "Go straight to the official application page — no middlemen, no pay-to-apply schemes.",
  },
  {
    icon: LineChart,
    title: "Track",
    description:
      "Keep every application, deadline and outcome in one place so nothing slips through the cracks.",
  },
];

export function ValueJourney() {
  return (
    <section className="w-full border-y border-border bg-primary py-16 text-primary-foreground sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/60">
            How ICK Opportunities works
          </span>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl lg:text-4xl">
            More than a listing site — an end-to-end opportunity workflow
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-primary-foreground/70">
            From finding the right opportunity to submitting a competitive
            application, every step is designed to move you forward.
          </p>
        </div>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-primary-foreground/15 bg-primary-foreground/15 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <li key={step.title} className="bg-primary p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-foreground/10 text-primary-foreground">
                  <step.icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-xs font-semibold tabular-nums text-primary-foreground/50">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-display text-base font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
