import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Internships — ICK Opportunities";
const description =
  "Internships and industrial training placements for Nigerian students and recent graduates.";

export const Route = createFileRoute("/internships")({
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
  component: InternshipsPage,
});

function InternshipsPage() {
  return (
    <OpportunityBrowser
      fixedCategory="internship"
      title="Internships"
      intro="Placements that build real experience, from remote programmes to on-site industrial training."
    />
  );
}
