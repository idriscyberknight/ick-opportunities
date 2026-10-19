import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";

const title = "Scholarships — ICK Opportunities";
const description =
  "Scholarships for Nigerian students studying at home and abroad, reviewed by our team, with a link to each source page.";

export const Route = createFileRoute("/scholarships")({
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
  component: ScholarshipsPage,
});

function ScholarshipsPage() {
  return (
    <OpportunityBrowser
      fixedCategory="scholarship"
      title="Scholarships"
      intro="Funding for undergraduate, postgraduate and research study, reviewed by our team. Check the details on each source page before you apply."
    />
  );
}
