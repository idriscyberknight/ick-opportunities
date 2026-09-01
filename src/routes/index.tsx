import { createFileRoute } from "@tanstack/react-router";

import { Hero } from "../components/Hero";
import { SearchSection } from "../components/SearchSection";
import { FeaturedOpportunities } from "../components/FeaturedOpportunities";
import { TrustSection } from "../components/TrustSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ICK Opportunities — Find Scholarships, Jobs, Internships & Grants" },
      {
        name: "description",
        content:
          "Discover scholarships, jobs, internships, and grants relevant to your goals. Nigeria-first opportunity discovery.",
      },
      {
        property: "og:title",
        content: "ICK Opportunities — Find Scholarships, Jobs, Internships & Grants",
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
      <SearchSection />
      <FeaturedOpportunities />
      <TrustSection />
    </>
  );
}
