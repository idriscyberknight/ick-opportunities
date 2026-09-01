import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Get Started — ICK Opportunities" },
      {
        name: "description",
        content: "Create your ICK Opportunities account and start tracking opportunities.",
      },
      { property: "og:title", content: "Get Started — ICK Opportunities" },
      {
        property: "og:description",
        content: "Create your ICK Opportunities account and start tracking opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GetStartedPage,
});

function GetStartedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Get Started
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Account creation and the CV builder are coming in a future step. This
        page is a placeholder for now.
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
