import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/grants")({
  head: () => ({
    meta: [
      { title: "Grants — ICK Opportunities" },
      {
        name: "description",
        content: "Discover grants and funding opportunities for young Nigerians and small ventures.",
      },
      { property: "og:title", content: "Grants — ICK Opportunities" },
      {
        property: "og:description",
        content: "Discover grants and funding opportunities for young Nigerians and small ventures.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GrantsPage,
});

function GrantsPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Grants
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        A curated grants directory is coming soon. Return to the home page for
        featured listings.
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
