import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign In — ICK Opportunities" },
      {
        name: "description",
        content: "Sign in to ICK Opportunities to save and track opportunities.",
      },
      { property: "og:title", content: "Sign In — ICK Opportunities" },
      {
        property: "og:description",
        content: "Sign in to ICK Opportunities to save and track opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Sign In
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Authentication is not enabled yet. This page is a placeholder for the
        upcoming sign-in experience.
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
