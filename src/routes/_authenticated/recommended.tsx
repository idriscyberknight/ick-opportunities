import { createFileRoute } from "@tanstack/react-router";
import { RecommendedOpportunities } from "@/components/RecommendedOpportunities";

export const Route = createFileRoute("/_authenticated/recommended")({
  head: () => ({
    meta: [
      { title: "Recommended For You — ICK Opportunities" },
      {
        name: "description",
        content: "Opportunities ranked by how well they match your profile and goals.",
      },
      { property: "og:title", content: "Recommended For You — ICK Opportunities" },
      {
        property: "og:description",
        content: "Opportunities ranked by how well they match your profile and goals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecommendedPage,
});

function RecommendedPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl">
          Recommended For You
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Active opportunities scored 0–100 against your skills, interests, education, location and
          preferred categories.
        </p>
      </header>
      <RecommendedOpportunities />
    </div>
  );
}
