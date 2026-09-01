import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";

export function Hero() {
  return (
    <section className="w-full bg-card py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-secondary">
            Nigeria-first opportunity discovery
          </span>

          <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find Opportunities. Build Your Future.
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Discover scholarships, jobs, internships, and grants that actually
            match your goals. We curate opportunities for young Nigerians ready
            to take the next step.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/opportunities"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
            >
              Find Opportunities
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/get-started"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent sm:w-auto"
            >
              <FileText className="h-4 w-4" />
              Build My CV
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
