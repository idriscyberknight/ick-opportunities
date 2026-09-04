import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Jobs — ICK Opportunities";
const description =
  "Graduate and early-career jobs across Nigeria and remote roles, linked to official employer listings.";

export const Route = createFileRoute("/jobs")({
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
  component: JobsPage,
});

function JobsPage() {
  return (
    <OpportunityBrowser
      fixedCategory="job"
      title="Jobs"
      intro="Entry-level and early-career roles from employers hiring now, with links to the official application page."
    />
  );
}
