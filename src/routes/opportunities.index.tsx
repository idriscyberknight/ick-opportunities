import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Browse Opportunities — ICK Opportunities";
const description =
  "Search verified scholarships, jobs, internships and grants curated for Nigerians at home and abroad.";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  return (
    <OpportunityBrowser
      title="Browse opportunities"
      intro="Scholarships, jobs, internships and grants. Every published listing links to the official source so you can apply directly."
    />
  );
}
