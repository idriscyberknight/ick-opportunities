import { supabase } from "@/integrations/supabase/client";

export const OPPORTUNITY_TYPES = [
  { value: "scholarships", label: "Scholarships" },
  { value: "jobs", label: "Jobs" },
  { value: "internships", label: "Internships" },
  { value: "grants", label: "Grants" },
] as const;

export const EDUCATION_LEVELS = [
  { value: "secondary_school", label: "Secondary School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "phd", label: "PhD" },
  { value: "other", label: "Other" },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: "none", label: "No experience" },
  { value: "entry", label: "Entry level" },
  { value: "intermediate", label: "Intermediate" },
  { value: "experienced", label: "Experienced" },
] as const;

export const REMOTE_PREFERENCES = [
  { value: "remote", label: "Remote only" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "No preference" },
] as const;

export const INTEREST_OPTIONS = [
  "Technology",
  "Engineering",
  "Health & Medicine",
  "Education",
  "Agriculture",
  "Business & Finance",
  "Law & Policy",
  "Creative & Media",
  "Science & Research",
  "Social Impact",
  "Entrepreneurship",
  "Environment & Climate",
];

export function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null | undefined,
): string {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export type ProfileData = {
  id: string;
  full_name: string | null;
  education_level: string | null;
  field_of_study: string | null;
  career_field: string | null;
  experience_level: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  remote_preference: string | null;
  onboarding_completed: boolean;
  opportunityTypes: string[];
  skills: string[];
  interests: string[];
};

export type ProfileInput = Omit<ProfileData, "id" | "onboarding_completed">;

export async function fetchProfile(userId: string): Promise<ProfileData | null> {
  const [profileRes, prefsRes, skillsRes, interestsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_opportunity_preferences").select("opportunity_type").eq("user_id", userId),
    supabase.from("user_skills").select("skills(name)").eq("user_id", userId),
    supabase.from("user_interests").select("interest").eq("user_id", userId),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;

  const p = profileRes.data;
  return {
    id: p.id,
    full_name: p.full_name,
    education_level: p.education_level,
    field_of_study: p.field_of_study,
    career_field: p.career_field,
    experience_level: p.experience_level,
    country: p.country,
    state: p.state,
    city: p.city,
    remote_preference: p.remote_preference,
    onboarding_completed: p.onboarding_completed,
    opportunityTypes: (prefsRes.data ?? []).map((r) => r.opportunity_type),
    skills: (skillsRes.data ?? [])
      .map((r) => (r.skills as { name: string } | null)?.name)
      .filter((n): n is string => !!n)
      .sort((a, b) => a.localeCompare(b)),
    interests: (interestsRes.data ?? []).map((r) => r.interest).sort((a, b) => a.localeCompare(b)),
  };
}

async function syncSkills(userId: string, skills: string[]) {
  const cleaned = Array.from(
    new Map(skills.map((s) => [s.trim().toLowerCase(), s.trim()])).values(),
  ).filter(Boolean);

  const skillIds: string[] = [];
  for (const name of cleaned) {
    const existing = await supabase.from("skills").select("id").ilike("name", name).maybeSingle();
    if (existing.data?.id) {
      skillIds.push(existing.data.id);
      continue;
    }
    const inserted = await supabase.from("skills").insert({ name }).select("id").maybeSingle();
    if (inserted.data?.id) skillIds.push(inserted.data.id);
  }

  const { error: delErr } = await supabase.from("user_skills").delete().eq("user_id", userId);
  if (delErr) throw delErr;
  if (skillIds.length) {
    const { error } = await supabase
      .from("user_skills")
      .insert(skillIds.map((skill_id) => ({ user_id: userId, skill_id })));
    if (error) throw error;
  }
}

export async function saveProfile(
  userId: string,
  input: ProfileInput,
  options: { completeOnboarding?: boolean } = {},
) {
  const { error: upsertErr } = await supabase.from("profiles").upsert({
    id: userId,
    full_name: input.full_name?.trim() || null,
    education_level: input.education_level || null,
    field_of_study: input.field_of_study?.trim() || null,
    career_field: input.career_field?.trim() || null,
    experience_level: input.experience_level || null,
    country: input.country?.trim() || null,
    state: input.state?.trim() || null,
    city: input.city?.trim() || null,
    remote_preference: input.remote_preference || null,
    ...(options.completeOnboarding ? { onboarding_completed: true } : {}),
  });
  if (upsertErr) throw upsertErr;

  const { error: prefDelErr } = await supabase
    .from("user_opportunity_preferences")
    .delete()
    .eq("user_id", userId);
  if (prefDelErr) throw prefDelErr;
  if (input.opportunityTypes.length) {
    const { error } = await supabase
      .from("user_opportunity_preferences")
      .insert(input.opportunityTypes.map((opportunity_type) => ({ user_id: userId, opportunity_type })));
    if (error) throw error;
  }

  const { error: intDelErr } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);
  if (intDelErr) throw intDelErr;
  if (input.interests.length) {
    const { error } = await supabase
      .from("user_interests")
      .insert(input.interests.map((interest) => ({ user_id: userId, interest })));
    if (error) throw error;
  }

  await syncSkills(userId, input.skills);
}

export function profileCompletion(profile: ProfileData): number {
  const checks = [
    !!profile.full_name,
    profile.opportunityTypes.length > 0,
    !!profile.education_level,
    !!profile.field_of_study,
    !!profile.career_field,
    !!profile.experience_level,
    profile.skills.length > 0,
    !!profile.country,
    !!profile.state || !!profile.city,
    !!profile.remote_preference,
    profile.interests.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
