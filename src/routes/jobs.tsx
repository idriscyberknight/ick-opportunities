import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — ICK Opportunities" },
      {
        name: "description",
        content: "Find jobs and graduate roles for young Nigerian professionals.",
      },
      { property: "og:title", content: "Jobs — ICK Opportunities" },
      {
        property: "og:description",
        content: "Find jobs and graduate roles for young Nigerian professionals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Jobs
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The jobs board is coming soon. Explore featured openings on the home
        page in the meantime.
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
