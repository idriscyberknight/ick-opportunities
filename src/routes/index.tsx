import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, MessageCircle } from "lucide-react";
import { WHATSAPP_CHANNEL_URL } from "@/lib/public-links";

import { Hero } from "../components/Hero";
import { ValueJourney } from "../components/ValueJourney";
import { TrustSection } from "../components/TrustSection";
import { RecommendedSection } from "../components/RecommendedOpportunities";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Find Scholarships, Jobs, Internships & Grants in Nigeria | ICK Opportunities" },
      {
        name: "description",
        content:
          "Discover scholarships, jobs, internships, and grants relevant to your goals. Nigeria-first opportunity discovery.",
      },
      {
        property: "og:title",
        content:
          "Find Scholarships, Jobs, Internships & Grants in Nigeria | ICK Opportunities",
      },
      {
        property: "og:description",
        content:
          "Discover scholarships, jobs, internships, and grants relevant to your goals. Nigeria-first opportunity discovery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <RecommendedSection className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8" />
      <ValueJourney />
      <TrustSection />
      <section aria-labelledby="whatsapp-channel-heading" className="bg-background px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Stay connected
            </p>
            <h2 id="whatsapp-channel-heading" className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Follow ICK Opportunities on WhatsApp
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Follow our channel for updates about scholarships, jobs, internships and grants.
              Channel posts are general announcements, not personalized alerts.
              Always verify application details with the official source.
            </p>
          </div>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
            Follow our WhatsApp Channel
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>
    </>
  );

}
