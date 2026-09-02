import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ICK Opportunities" },
      {
        name: "description",
        content: "Your personal ICK Opportunities dashboard for tracking relevant opportunities.",
      },
      { property: "og:title", content: "Dashboard — ICK Opportunities" },
      {
        property: "og:description",
        content: "Your personal ICK Opportunities dashboard for tracking relevant opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setEmail(data.user.email ?? "");
      const metaName = (data.user.user_metadata?.["full_name"] as string | undefined) ?? "";
      setFullName(metaName);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active && profile?.full_name) setFullName(profile.full_name);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/signin", replace: true });
  }

  const greetingName = fullName.trim() ? fullName.trim().split(" ")[0] : "there";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Welcome, {greetingName}
          </h1>
          {email ? (
            <p className="mt-2 truncate text-sm text-muted-foreground">Signed in as {email}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
          Personalized opportunities are coming soon
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your account is ready. Once matching is live, scholarships, jobs, internships, and grants
          selected for your profile and goals will appear here — each checked against its official
          source before it reaches you.
        </p>
      </div>
    </div>
  );
}
