import { createFileRoute } from "@tanstack/react-router";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";
import type { OpportunityCategory } from "@/lib/opportunities";

const title = "Browse Opportunities — ICK Opportunities";
const description =
  "Search scholarships, jobs, internships and grants reviewed by our team, curated for Nigerians at home and abroad.";

const CATEGORY_VALUES: readonly OpportunityCategory[] = [
  "scholarship",
  "job",
  "internship",
  "grant",
];

type OpportunitiesSearch = {
  q?: string;
  category?: OpportunityCategory;
};

export const Route = createFileRoute("/opportunities/")({
  validateSearch: (search: Record<string, unknown>): OpportunitiesSearch => {
    const result: OpportunitiesSearch = {};
    const rawQuery = search["q"];
    if (typeof rawQuery === "string") {
      const q = rawQuery.trim().slice(0, 100);
      if (q) result.q = q;
    }
    const category = CATEGORY_VALUES.find((c) => c === search["category"]);
    if (category) result.category = category;
    return result;
  },
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
  const { q, category } = Route.useSearch();
  return (
    <OpportunityBrowser
      key={`${q ?? ""}|${category ?? ""}`}
      initialSearch={q}
      initialCategory={category}
      title="Browse opportunities"
      intro="Scholarships, jobs, internships and grants. Every published listing links to its source page; check the details there before you apply."
    />
  );
        }
