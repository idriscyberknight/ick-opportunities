import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities — ICK Opportunities" },
      {
        name: "description",
        content: "Browse scholarships, jobs, internships, and grants curated for Nigerians.",
      },
      { property: "og:title", content: "Opportunities — ICK Opportunities" },
      {
        property: "og:description",
        content: "Browse scholarships, jobs, internships, and grants curated for Nigerians.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Opportunities
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The full opportunities directory is coming soon. For now, explore the
        featured listings on the home page.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to home
      </Link>
    </div>
  );
}
