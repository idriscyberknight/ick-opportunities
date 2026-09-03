import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitClass } from "@/components/AuthShell";
import {
  ChipToggleGroup,
  SelectField,
  TagInput,
  TextField,
  Field,
} from "@/components/ProfileFields";
import {
  EDUCATION_LEVELS,
  EXPERIENCE_LEVELS,
  INTEREST_OPTIONS,
  OPPORTUNITY_TYPES,
  REMOTE_PREFERENCES,
  fetchProfile,
  labelFor,
  saveProfile,
  type ProfileInput,
} from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — ICK Opportunities" },
      {
        name: "description",
        content:
          "Tell ICK Opportunities what you're looking for so scholarships, jobs, internships, and grants can be matched to you.",
      },
      { property: "og:title", content: "Set up your profile — ICK Opportunities" },
      {
        property: "og:description",
        content:
          "Tell ICK Opportunities what you're looking for so scholarships, jobs, internships, and grants can be matched to you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["Goals", "Education", "Career", "Location", "Interests", "Summary"];

const emptyForm: ProfileInput = {
  full_name: "",
  education_level: "",
  field_of_study: "",
  career_field: "",
  experience_level: "",
  country: "Nigeria",
  state: "",
  city: "",
  remote_preference: "",
  opportunityTypes: [],
  skills: [],
  interests: [],
};

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileInput>(emptyForm);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setUserId(data.user.id);
      const profile = await fetchProfile(data.user.id).catch(() => null);
      if (!active) return;
      const metaName = (data.user.user_metadata?.["full_name"] as string | undefined) ?? "";
      setForm({
        full_name: profile?.full_name || metaName,
        education_level: profile?.education_level ?? "",
        field_of_study: profile?.field_of_study ?? "",
        career_field: profile?.career_field ?? "",
        experience_level: profile?.experience_level ?? "",
        country: profile?.country || "Nigeria",
        state: profile?.state ?? "",
        city: profile?.city ?? "",
        remote_preference: profile?.remote_preference ?? "",
        opportunityTypes: profile?.opportunityTypes ?? [],
        skills: profile?.skills ?? [],
        interests: profile?.interests ?? [],
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function toggle(key: "opportunityTypes" | "interests", value: string) {
    setForm((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
    setError(null);
  }

  const stepError = useMemo(() => {
    if (step === 0 && form.opportunityTypes.length === 0)
      return "Select at least one type of opportunity.";
    if (step === 1) {
      if (!form.education_level) return "Select your education level.";
      if (!form.field_of_study?.trim()) return "Enter your field of study.";
    }
    if (step === 2) {
      if (!form.career_field?.trim()) return "Enter your career field.";
      if (!form.experience_level) return "Select your experience level.";
      if (form.skills.length === 0) return "Add at least one skill.";
    }
    if (step === 3) {
      if (!form.country?.trim()) return "Enter your country.";
      if (!form.remote_preference) return "Select a remote work preference.";
    }
    if (step === 4 && form.interests.length === 0) return "Select at least one interest.";
    return null;
  }, [step, form]);

  function next() {
    if (stepError) {
      setError(stepError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile(userId, form, { completeOnboarding: true });
      await queryClient.invalidateQueries();
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save your profile. Please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl items-center justify-center px-4 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading your profile</span>
      </div>
    );
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        Set up your profile
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This helps us show opportunities that actually fit you. You can change any of it later.
      </p>

      <div
        className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Onboarding progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,0.06)] sm:p-7">
        {step === 0 ? (
          <div className="space-y-4">
            <Field label="What are you looking for?" hint="Choose all that apply.">
              <div className="mt-3">
                <ChipToggleGroup
                  options={OPPORTUNITY_TYPES}
                  selected={form.opportunityTypes}
                  onToggle={(v) => toggle("opportunityTypes", v)}
                />
              </div>
            </Field>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <SelectField
              label="Education level"
              id="education_level"
              value={form.education_level ?? ""}
              onChange={(v) => update("education_level", v)}
              options={EDUCATION_LEVELS}
            />
            <TextField
              label="Field of study"
              id="field_of_study"
              value={form.field_of_study ?? ""}
              onChange={(v) => update("field_of_study", v)}
              placeholder="e.g. Computer Science"
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <TextField
              label="Career field"
              id="career_field"
              value={form.career_field ?? ""}
              onChange={(v) => update("career_field", v)}
              placeholder="e.g. Software Engineering"
            />
            <SelectField
              label="Experience level"
              id="experience_level"
              value={form.experience_level ?? ""}
              onChange={(v) => update("experience_level", v)}
              options={EXPERIENCE_LEVELS}
            />
            <TagInput
              label="Skills"
              id="skills"
              values={form.skills}
              onChange={(v) => update("skills", v)}
              placeholder="e.g. Data analysis"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <TextField
              label="Country"
              id="country"
              value={form.country ?? ""}
              onChange={(v) => update("country", v)}
              placeholder="Country"
            />
            <TextField
              label="State / Region"
              id="state"
              value={form.state ?? ""}
              onChange={(v) => update("state", v)}
              placeholder="Optional"
            />
            <TextField
              label="City"
              id="city"
              value={form.city ?? ""}
              onChange={(v) => update("city", v)}
              placeholder="Optional"
            />
            <SelectField
              label="Remote opportunities"
              id="remote_preference"
              value={form.remote_preference ?? ""}
              onChange={(v) => update("remote_preference", v)}
              options={REMOTE_PREFERENCES}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <Field label="Interests" hint="Pick the areas you care about most.">
            <div className="mt-3">
              <ChipToggleGroup
                options={INTEREST_OPTIONS.map((i) => ({ value: i, label: i }))}
                selected={form.interests}
                onToggle={(v) => toggle("interests", v)}
              />
            </div>
          </Field>
        ) : null}

        {step === 5 ? (
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
              Review your profile
            </h2>
            <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
              <SummaryRow
                label="Looking for"
                value={form.opportunityTypes
                  .map((t) => labelFor(OPPORTUNITY_TYPES, t))
                  .join(", ")}
              />
              <SummaryRow
                label="Education"
                value={[labelFor(EDUCATION_LEVELS, form.education_level), form.field_of_study]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <SummaryRow
                label="Career"
                value={[form.career_field, labelFor(EXPERIENCE_LEVELS, form.experience_level)]
                  .filter(Boolean)
                  .join(" · ")}
              />
              <SummaryRow label="Skills" value={form.skills.join(", ")} />
              <SummaryRow
                label="Location"
                value={[form.city, form.state, form.country].filter(Boolean).join(", ")}
              />
              <SummaryRow
                label="Remote"
                value={labelFor(REMOTE_PREFERENCES, form.remote_preference)}
              />
              <SummaryRow label="Interests" value={form.interests.join(", ")} />
            </dl>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-5 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
          {step === STEPS.length - 1 ? (
            <button type="button" onClick={finish} disabled={saving} className={submitClass}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="mr-2 h-4 w-4" aria-hidden />
              )}
              {saving ? "Saving…" : "Continue to Dashboard"}
            </button>
          ) : (
            <button type="button" onClick={next} className={submitClass}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </button>
          )}
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60 sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{value || "—"}</dd>
    </div>
  );
}
