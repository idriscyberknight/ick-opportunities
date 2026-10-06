import { createFileRoute } from "@tanstack/react-router";

import { Hero } from "../components/Hero";
import { FeaturedOpportunities } from "../components/FeaturedOpportunities";
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
      <FeaturedOpportunities />
      <ValueJourney />
      <TrustSection />
    </>
  );

}
