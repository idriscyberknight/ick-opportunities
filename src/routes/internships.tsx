import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/internships")({
  head: () => ({
    meta: [
      { title: "Internships — ICK Opportunities" },
      {
        name: "description",
        content: "Find internships and trainee programmes for Nigerian students and graduates.",
      },
      { property: "og:title", content: "Internships — ICK Opportunities" },
      {
        property: "og:description",
        content: "Find internships and trainee programmes for Nigerian students and graduates.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InternshipsPage,
});

function InternshipsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Internships
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The internships section is coming soon. Watch this space.
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
