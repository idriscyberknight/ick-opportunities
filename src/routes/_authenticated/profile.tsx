import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitClass } from "@/components/AuthShell";
import {
  ChipToggleGroup,
  Field,
  SelectField,
  TagInput,
  TextField,
} from "@/components/ProfileFields";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  INTEREST_OPTIONS,
  OPPORTUNITY_TYPES,
  REMOTE_PREFERENCES,
  fetchProfile,
  profileCompletion,
  saveProfile,
  type ProfileData,
  type ProfileInput,
} from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — ICK Opportunities" },
      {
        name: "description",
        content:
          "Manage your education, career, skills, interests, location, and opportunity preferences on ICK Opportunities.",
      },
      { property: "og:title", content: "Your profile — ICK Opportunities" },
      {
        property: "og:description",
        content:
          "Manage your education, career, skills, interests, location, and opportunity preferences on ICK Opportunities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 sm:p-7">
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ProfileInput | null>(null);
  const [completion, setCompletion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setUserId(data.user.id);
      setEmail(data.user.email ?? "");
      const profile = await fetchProfile(data.user.id).catch(() => null);
      if (!active) return;
      const next: ProfileInput = {
        full_name: profile?.full_name ?? "",
        education_level: profile?.education_level ?? "",
        field_of_study: profile?.field_of_study ?? "",
        career_field: profile?.career_field ?? "",
        experience_level: profile?.experience_level ?? "",
        country: profile?.country ?? "",
        state: profile?.state ?? "",
        city: profile?.city ?? "",
        remote_preference: profile?.remote_preference ?? "",
        opportunityTypes: profile?.opportunityTypes ?? [],
        skills: profile?.skills ?? [],
        interests: profile?.interests ?? [],
      };
      setForm(next);
      setCompletion(
        profileCompletion({
          ...(next as ProfileData),
          id: data.user.id,
          onboarding_completed: profile?.onboarding_completed ?? false,
        }),
      );
    });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setStatus(null);
  }

  function toggle(key: "opportunityTypes" | "interests", value: string) {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
    setStatus(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form) return;
    if (!form.full_name?.trim()) {
      setStatus({ kind: "error", message: "Please enter your full name." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await saveProfile(userId, form);
      const fresh = await fetchProfile(userId);
      if (fresh) {
        setCompletion(profileCompletion(fresh));
        setForm({
          full_name: fresh.full_name ?? "",
          education_level: fresh.education_level ?? "",
          field_of_study: fresh.field_of_study ?? "",
          career_field: fresh.career_field ?? "",
          experience_level: fresh.experience_level ?? "",
          country: fresh.country ?? "",
          state: fresh.state ?? "",
          city: fresh.city ?? "",
          remote_preference: fresh.remote_preference ?? "",
          opportunityTypes: fresh.opportunityTypes,
          skills: fresh.skills,
          interests: fresh.interests,
        });
      }
      setStatus({ kind: "ok", message: "Your profile has been saved." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "We couldn't save your changes.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading your profile</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Profile
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Your profile
      </h1>
      {email ? (
        <p className="mt-2 truncate text-sm text-muted-foreground">Signed in as {email}</p>
      ) : null}

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-foreground">
            Your profile is {completion}% complete
          </p>
          <span className="text-xs text-muted-foreground">{completion}%</span>
        </div>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={completion}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-6">
        <Section title="Personal information">
          <TextField
            label="Full name"
            id="full_name"
            value={form.full_name ?? ""}
            onChange={(v) => update("full_name", v)}
          />
        </Section>

        <Section title="Education">
          <SelectField
            label="Education level"
            id="p_education_level"
            value={form.education_level ?? ""}
            onChange={(v) => update("education_level", v)}
            options={EDUCATION_LEVELS}
          />
          <TextField
            label="Field of study"
            id="p_field_of_study"
            value={form.field_of_study ?? ""}
            onChange={(v) => update("field_of_study", v)}
          />
        </Section>

        <Section title="Career">
          <TextField
            label="Career field"
            id="p_career_field"
            value={form.career_field ?? ""}
            onChange={(v) => update("career_field", v)}
          />
          <SelectField
            label="Experience level"
            id="p_experience_level"
            value={form.experience_level ?? ""}
            onChange={(v) => update("experience_level", v)}
            options={EXPERIENCE_LEVELS}
          />
        </Section>

        <Section title="Skills">
          <TagInput
            label="Your skills"
            id="p_skills"
            values={form.skills}
            onChange={(v) => update("skills", v)}
          />
        </Section>

        <Section title="Interests">
          <Field label="Interest areas">
            <div className="mt-3">
              <ChipToggleGroup
                options={INTEREST_OPTIONS.map((i) => ({ value: i, label: i }))}
                selected={form.interests}
                onToggle={(v) => toggle("interests", v)}
              />
            </div>
          </Field>
        </Section>

        <Section title="Location">
          <TextField
            label="Country"
            id="p_country"
            value={form.country ?? ""}
            onChange={(v) => update("country", v)}
          />
          <TextField
            label="State / Region"
            id="p_state"
            value={form.state ?? ""}
            onChange={(v) => update("state", v)}
          />
          <TextField
            label="City"
            id="p_city"
            value={form.city ?? ""}
            onChange={(v) => update("city", v)}
          />
          <SelectField
            label="Remote opportunities"
            id="p_remote_preference"
            value={form.remote_preference ?? ""}
            onChange={(v) => update("remote_preference", v)}
            options={REMOTE_PREFERENCES}
          />
        </Section>

        <Section title="Opportunity preferences">
          <Field label="What are you looking for?">
            <div className="mt-3">
              <ChipToggleGroup
                options={OPPORTUNITY_TYPES}
                selected={form.opportunityTypes}
                onToggle={(v) => toggle("opportunityTypes", v)}
              />
            </div>
          </Field>
        </Section>

        {status ? (
          <p
            role="alert"
            className={
              status.kind === "ok"
                ? "flex items-center gap-2 text-sm font-medium text-foreground"
                : "text-sm font-medium text-destructive"
            }
          >
            {status.kind === "ok" ? (
              <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
            ) : null}
            {status.message}
          </p>
        ) : null}

        <button type="submit" disabled={saving} className={submitClass}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
