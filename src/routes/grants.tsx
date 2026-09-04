import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Grants — ICK Opportunities";
const description =
  "Grants and funding for Nigerian founders, researchers and community projects, verified against official sources.";

export const Route = createFileRoute("/grants")({
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
  component: GrantsPage,
});

function GrantsPage() {
  return (
    <OpportunityBrowser
      fixedCategory="grant"
      title="Grants"
      intro="Seed funding, research grants and project support for individuals and early-stage teams."
    />
  );
}
