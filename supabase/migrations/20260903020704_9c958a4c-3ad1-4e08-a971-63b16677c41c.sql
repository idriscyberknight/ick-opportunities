ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS field_of_study text,
  ADD COLUMN IF NOT EXISTS career_field text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS remote_preference text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_education_level_check CHECK (education_level IS NULL OR education_level IN ('secondary_school','undergraduate','graduate','postgraduate','phd','other')),
  ADD CONSTRAINT profiles_experience_level_check CHECK (experience_level IS NULL OR experience_level IN ('none','entry','intermediate','experienced')),
  ADD CONSTRAINT profiles_remote_preference_check CHECK (remote_preference IS NULL OR remote_preference IN ('remote','onsite','hybrid','any'));

CREATE TABLE public.user_opportunity_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL CHECK (opportunity_type IN ('scholarships','jobs','internships','grants')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_opportunity_preferences TO authenticated;
GRANT ALL ON public.user_opportunity_preferences TO service_role;
ALTER TABLE public.user_opportunity_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own opportunity preferences"
  ON public.user_opportunity_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read skills" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users can add skills" ON public.skills FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills TO authenticated;
GRANT ALL ON public.user_skills TO service_role;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own skills"
  ON public.user_skills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.user_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, interest)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;
GRANT ALL ON public.user_interests TO service_role;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own interests"
  ON public.user_interests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);