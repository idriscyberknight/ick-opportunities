import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/opportunities";

import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  OPPORTUNITY_TYPES,
  REMOTE_PREFERENCES,
  fetchProfile,
  labelFor,
  profileCompletion,
  type ProfileData,
} from "@/lib/profile";

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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setEmail(data.user.email ?? "");
      const p = await fetchProfile(data.user.id).catch(() => null);
      if (!active) return;
      setProfile(p);
      setLoading(false);
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

  const fullName = profile?.full_name ?? "";
  const greetingName = fullName.trim() ? fullName.trim().split(" ")[0] : "there";
  const completion = profile ? profileCompletion(profile) : 0;

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
        <div className="flex shrink-0 flex-wrap gap-2">
          {isAdmin ? (
            <Link
              to="/admin/opportunities"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Manage opportunities
            </Link>
          ) : null}
          <Link
            to="/profile"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <UserCog className="h-4 w-4" aria-hidden />
            Edit profile
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>

      <section className="mt-10 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Your preferences
          </h2>
          {profile ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Profile {completion}% complete
            </span>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your profile…
          </div>
        ) : (
          <dl className="mt-5 divide-y divide-border border-y border-border">
            <Row
              label="Opportunity types"
              value={(profile?.opportunityTypes ?? [])
                .map((t) => labelFor(OPPORTUNITY_TYPES, t))
                .join(", ")}
            />
            <Row
              label="Education"
              value={[
                labelFor(EDUCATION_LEVELS, profile?.education_level),
                profile?.field_of_study,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row
              label="Career field"
              value={[profile?.career_field, labelFor(EXPERIENCE_LEVELS, profile?.experience_level)]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row label="Skills" value={(profile?.skills ?? []).join(", ")} />
            <Row
              label="Location"
              value={[
                [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", "),
                labelFor(REMOTE_PREFERENCES, profile?.remote_preference),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Row label="Interests" value={(profile?.interests ?? []).join(", ")} />
          </dl>
        )}
      </section>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold tracking-tight text-foreground">
          Personalized opportunities are coming soon
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your profile is saved. Once matching is live, scholarships, jobs, internships, and grants
          selected for your profile and goals will appear here — each checked against its official
          source before it reaches you.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{value || "Not set"}</dd>
    </div>
  );
}
