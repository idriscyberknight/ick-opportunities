-- DESIGN / ISOLATED POSTGRES CI ONLY. NOT A PRODUCTION MIGRATION.
-- This file MUST NOT be applied to Lovable Cloud or production without
-- separate Founder approval, reviewed migration process and real JWT tests.
-- Prerequisites: Supabase auth.users, auth.uid(), opportunity_category,
-- and public.opportunities (CI uses temporary mock equivalents).
BEGIN;

CREATE TABLE public.alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  new_matches_enabled boolean NOT NULL DEFAULT true,
  saved_deadlines_enabled boolean NOT NULL DEFAULT true,
  categories public.opportunity_category[] NOT NULL DEFAULT '{}',
  minimum_match_score smallint NOT NULL DEFAULT 40
    CONSTRAINT alert_preferences_score_range CHECK (minimum_match_score BETWEEN 0 AND 100),
  deadline_lead_days smallint[] NOT NULL DEFAULT '{1,3,7}',
  timezone text NOT NULL DEFAULT 'Etc/UTC',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_preferences_categories_unique CHECK (
    cardinality(categories) <= 4
    AND cardinality(array_positions(categories, 'scholarship'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'job'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'internship'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'grant'::public.opportunity_category)) <= 1
  ),
  CONSTRAINT alert_preferences_deadline_window CHECK (
    deadline_lead_days <@ ARRAY[1, 3, 7]::smallint[]
    AND cardinality(deadline_lead_days) BETWEEN 1 AND 3
    AND cardinality(array_positions(deadline_lead_days, 1::smallint)) <= 1
    AND cardinality(array_positions(deadline_lead_days, 3::smallint)) <= 1
    AND cardinality(array_positions(deadline_lead_days, 7::smallint)) <= 1
  ),
  -- Syntax and length validation ONLY. IANA zone validation remains a trusted backend gate.
  CONSTRAINT alert_preferences_timezone_shape CHECK (
    length(timezone) BETWEEN 3 AND 64
    AND timezone ~ '^[A-Za-z][A-Za-z0-9_+.-]*/[A-Za-z][A-Za-z0-9_+./-]*$'
  )
);

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT user_notifications_kind_check
    CHECK (kind IN ('new_match','saved_deadline')),
  event_key text NOT NULL CONSTRAINT user_notifications_event_key_check
    CHECK (length(event_key) BETWEEN 1 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz NULL,
  dismissed_at timestamptz NULL,
  CONSTRAINT user_notifications_user_event_unique UNIQUE (user_id, event_key)
);

CREATE INDEX user_notifications_owner_created_idx
  ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX user_notifications_owner_unread_idx
  ON public.user_notifications(user_id, read_at)
  WHERE dismissed_at IS NULL;

ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Postgres/Supabase may grant broad privileges via ALTER DEFAULT PRIVILEGES.
-- Explicitly eliminate all anon and authenticated writes other than owner
-- preferences and user-owned read_at/dismissed_at column updates.
REVOKE ALL ON TABLE public.alert_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alert_preferences TO authenticated;
GRANT SELECT, UPDATE (read_at, dismissed_at) ON TABLE public.user_notifications TO authenticated;

CREATE POLICY alert_pref_owner_select ON public.alert_preferences
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY alert_pref_owner_insert ON public.alert_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY alert_pref_owner_update ON public.alert_preferences
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY alert_pref_owner_delete ON public.alert_preferences
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_notification_owner_select ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_notification_owner_update ON public.user_notifications
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No authenticated/anon INSERT, DELETE, TRUNCATE, REFERENCES, or TRIGGER
-- grants on user_notifications. Only a separately reviewed trusted delivery
-- backend may create notification rows; never expose a service-role secret.
-- Notification text is NOT stored: application must join still-public opportunities
-- under their own strict RLS before displaying an alert.

COMMIT;
