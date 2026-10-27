-- ICK Opportunities A1.8: PRODUCTION-SPECIFIC SCHEMA CANDIDATE (REVIEW ONLY)
-- UTC DATE: 2026-10-26. OFFICIAL PRODUCTION LOVABLE PROJECT:
-- 433a53c8-8872-49f2-b7b8-3e8dc7e96e35
-- THIS IS PROPOSED DDL ONLY; DO NOT EXECUTE ON LOVABLE CLOUD, SUPABASE,
-- PRODUCTION OR STAGING WITHOUT SEPARATE EXPLICIT FOUNDER APPROVAL,
-- RESTORE-TESTED BACKUP, HUMAN SQL REVIEW AND TARGET-IDENTITY VERIFICATION.
-- DO NOT PLACE THIS FILE IN supabase/migrations OR AUTO-APPLY VIA CI.
-- NOTHING IN THIS FILE SENDS ALERTS, EMAIL, WHATSAPP OR PUSH MESSAGES.
-- Production baseline independently read 2026-10-26:
-- PG 17.6; 'public.university_review_events' + 'supabase_migrations.schema_migrations'
-- exist, but public.alert_preferences and public.user_notifications do not.
-- Production baseline 19 public tables, reviewed opportunity columns match.
-- IMPORTANT: THIS SQL IS NOT INTERCHANGEABLE WITH THE STAGING-SPECIFIC SQL.
--
-- ATOMIC: a preflight failure aborts the whole transaction, changing nothing.
-- For a previously applied migration, there is NO automatic rollback.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $a18_production_preflight$
DECLARE
  cat_values text[];
  status_values text[];
  verified_values text[];
BEGIN
  -- Snapshot signatures prevent accidental execution against the prior Staging
  -- backend. They do not uniquely identify the project; verify target separately.
  IF to_regclass('public.university_review_events') IS NULL
     OR to_regclass('supabase_migrations.schema_migrations') IS NULL
     OR to_regclass('auth.users') IS NULL
     OR to_regprocedure('auth.uid()') IS NULL
     OR to_regclass('public.opportunities') IS NULL
     OR to_regclass('public.saved_opportunities') IS NULL
     OR to_regclass('public.profiles') IS NULL
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: Production snapshot signature missing'; END IF;

  IF to_regclass('public.alert_preferences') IS NOT NULL
     OR to_regclass('public.user_notifications') IS NOT NULL
     OR to_regprocedure('public.a18_preferences_stamp_updated()') IS NOT NULL
     OR to_regprocedure('public.a18_notification_stamp_actions()') IS NOT NULL
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: alert objects already exist; do not replay'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: API roles missing'; END IF;

  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO cat_values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
   WHERE n.nspname='public' AND t.typname='opportunity_category';
  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO status_values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
   WHERE n.nspname='public' AND t.typname='opportunity_status';
  SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder) INTO verified_values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
    JOIN pg_namespace n ON n.oid=t.typnamespace
   WHERE n.nspname='public' AND t.typname='verified_status';
  IF cat_values IS DISTINCT FROM ARRAY['scholarship','job','internship','grant']::text[]
     OR status_values IS DISTINCT FROM ARRAY['active','draft','expired','rejected']::text[]
     OR verified_values IS DISTINCT FROM ARRAY['verified','pending_review']::text[]
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: enum type drift'; END IF;

  IF (SELECT relrowsecurity FROM pg_class
      WHERE oid='public.opportunities'::regclass) IS DISTINCT FROM true
     OR (SELECT relrowsecurity FROM pg_class
      WHERE oid='public.saved_opportunities'::regclass) IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: required existing RLS disabled'; END IF;

  IF NOT has_table_privilege('authenticated','public.opportunities','SELECT')
  THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: opportunity SELECT grant drift'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='id' AND udt_name='uuid' AND is_nullable='NO'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='deadline' AND udt_name='date'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='status' AND udt_name='opportunity_status'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='verified_status' AND udt_name='verified_status'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='reviewed_by' AND udt_name='uuid'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='reviewed_at' AND udt_name='timestamptz'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='opportunities'
      AND column_name='published_at' AND udt_name='timestamptz'
  ) THEN RAISE EXCEPTION 'A1.8 PRODUCTION STOP: required opportunity columns drift'; END IF;

END
$a18_production_preflight$;

CREATE TABLE public.alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  new_matches_enabled boolean NOT NULL DEFAULT true,
  saved_deadlines_enabled boolean NOT NULL DEFAULT true,
  categories public.opportunity_category[] NOT NULL DEFAULT '{}',
  minimum_match_score smallint NOT NULL DEFAULT 40
    CONSTRAINT a18_pref_score_check CHECK (minimum_match_score BETWEEN 0 AND 100),
  deadline_lead_days smallint[] NOT NULL DEFAULT '{1,3,7}',
  timezone text NOT NULL DEFAULT 'Etc/UTC',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT a18_pref_categories_check CHECK (
    cardinality(categories) <= 4
    AND array_position(categories, NULL::public.opportunity_category) IS NULL
    AND cardinality(array_positions(categories, 'scholarship'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'job'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'internship'::public.opportunity_category)) <= 1
    AND cardinality(array_positions(categories, 'grant'::public.opportunity_category)) <= 1
  ),
  CONSTRAINT a18_pref_deadline_days_check CHECK (
    deadline_lead_days <@ ARRAY[1,3,7]::smallint[]
    AND cardinality(deadline_lead_days) BETWEEN 1 AND 3
    AND array_position(deadline_lead_days, NULL::smallint) IS NULL
    AND cardinality(array_positions(deadline_lead_days,1::smallint)) <= 1
    AND cardinality(array_positions(deadline_lead_days,3::smallint)) <= 1
    AND cardinality(array_positions(deadline_lead_days,7::smallint)) <= 1
  ),
  -- Shape only; genuine IANA-zone validation MUST occur in trusted backend.
  CONSTRAINT a18_pref_timezone_shape CHECK (
    length(timezone) BETWEEN 3 AND 64
    AND timezone ~ '^[A-Za-z][A-Za-z0-9_+.-]*/[A-Za-z][A-Za-z0-9_+./-]*$'
  )
);

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT a18_notification_kind_check
    CHECK (kind IN ('new_match','saved_deadline')),
  event_key text NOT NULL CONSTRAINT a18_event_key_check
    CHECK (length(event_key) BETWEEN 1 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT a18_unique_user_event UNIQUE (user_id,event_key)
);

CREATE INDEX a18_notifications_user_created_idx
  ON public.user_notifications(user_id,created_at DESC);
CREATE INDEX a18_notifications_unread_idx
  ON public.user_notifications(user_id,read_at)
  WHERE dismissed_at IS NULL;

-- SECURITY INVOKER: business timestamps must be set by the database, not by
-- a browser-supplied value. Revoke direct function EXECUTE after trigger setup.
CREATE FUNCTION public.a18_preferences_stamp_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
BEGIN
  NEW.updated_at := transaction_timestamp();
  RETURN NEW;
END
$fn$;
CREATE TRIGGER a18_preferences_updated
  BEFORE UPDATE ON public.alert_preferences
  FOR EACH ROW EXECUTE FUNCTION public.a18_preferences_stamp_updated();

CREATE FUNCTION public.a18_notification_stamp_actions()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
BEGIN
  IF NEW.read_at IS DISTINCT FROM OLD.read_at THEN
    IF OLD.read_at IS NOT NULL OR NEW.read_at IS NULL THEN
      RAISE EXCEPTION 'Cannot reverse or rewrite read timestamp';
    END IF;
    NEW.read_at := transaction_timestamp();
  END IF;
  IF NEW.dismissed_at IS DISTINCT FROM OLD.dismissed_at THEN
    IF OLD.dismissed_at IS NOT NULL OR NEW.dismissed_at IS NULL THEN
      RAISE EXCEPTION 'Cannot reverse or rewrite dismissal timestamp';
    END IF;
    NEW.dismissed_at := transaction_timestamp();
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER a18_notification_action_timestamps
  BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.a18_notification_stamp_actions();

-- Creator default privileges currently include broad grants in both systems.
-- Explicitly revoke; then permit only required columns/operations.
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.alert_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.a18_preferences_stamp_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.a18_notification_stamp_actions() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.alert_preferences TO authenticated;
GRANT INSERT (user_id,enabled,new_matches_enabled,saved_deadlines_enabled,
              categories,minimum_match_score,deadline_lead_days,timezone)
  ON public.alert_preferences TO authenticated;
GRANT UPDATE (enabled,new_matches_enabled,saved_deadlines_enabled,
              categories,minimum_match_score,deadline_lead_days,timezone)
  ON public.alert_preferences TO authenticated;
GRANT DELETE ON TABLE public.alert_preferences TO authenticated;

-- Browser must NEVER insert/delete user_notifications or see internal
-- event_key/user_id columns. Database grants + RLS must both enforce this.
GRANT SELECT (id,opportunity_id,kind,created_at,read_at,dismissed_at)
  ON public.user_notifications TO authenticated;
GRANT UPDATE (read_at,dismissed_at)
  ON public.user_notifications TO authenticated;

CREATE POLICY a18_preferences_owner_select ON public.alert_preferences
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_insert ON public.alert_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_update ON public.alert_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_delete ON public.alert_preferences
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Crucial: publication must be explicitly checked, even if an authenticated
-- admin can see draft opportunities via another opportunity SELECT policy.
-- Opt-out hides the inbox as well as suppressing future deliveries.
CREATE POLICY a18_notifications_safe_owner_select ON public.user_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.alert_preferences p
       WHERE p.user_id = (SELECT auth.uid()) AND p.enabled
    )
    AND EXISTS (
      SELECT 1 FROM public.opportunities o
       WHERE o.id = user_notifications.opportunity_id
         AND o.status = 'active'::public.opportunity_status
         AND o.verified_status = 'verified'::public.verified_status
         AND o.reviewed_by IS NOT NULL
         AND o.reviewed_at IS NOT NULL
         AND o.published_at IS NOT NULL
         AND o.published_at <= now()
         AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    )
  );

CREATE POLICY a18_notifications_safe_owner_update ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.alert_preferences p
       WHERE p.user_id = (SELECT auth.uid()) AND p.enabled
    )
    AND EXISTS (
      SELECT 1 FROM public.opportunities o
       WHERE o.id = user_notifications.opportunity_id
         AND o.status = 'active'::public.opportunity_status
         AND o.verified_status = 'verified'::public.verified_status
         AND o.reviewed_by IS NOT NULL
         AND o.reviewed_at IS NOT NULL
         AND o.published_at IS NOT NULL
         AND o.published_at <= now()
         AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.alert_preferences p
       WHERE p.user_id = (SELECT auth.uid()) AND p.enabled
    )
    AND EXISTS (
      SELECT 1 FROM public.opportunities o
       WHERE o.id = user_notifications.opportunity_id
         AND o.status = 'active'::public.opportunity_status
         AND o.verified_status = 'verified'::public.verified_status
         AND o.reviewed_by IS NOT NULL
         AND o.reviewed_at IS NOT NULL
         AND o.published_at IS NOT NULL
         AND o.published_at <= now()
         AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    )
  );

-- Candidate fail-closed SQL permission invariants.
DO $a18_verify$
BEGIN
 IF (SELECT relrowsecurity FROM pg_class WHERE oid='public.alert_preferences'::regclass) IS DISTINCT FROM true
    OR (SELECT relrowsecurity FROM pg_class WHERE oid='public.user_notifications'::regclass) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'A1.8 RLS must be enabled'; END IF;

 IF has_table_privilege('anon','public.alert_preferences','SELECT')
    OR has_table_privilege('anon','public.user_notifications','SELECT')
    OR has_table_privilege('authenticated','public.user_notifications','INSERT')
    OR has_table_privilege('authenticated','public.user_notifications','DELETE')
    OR has_table_privilege('authenticated','public.user_notifications','TRUNCATE')
 THEN RAISE EXCEPTION 'A1.8 unsafe anon or notification table privilege'; END IF;

 IF has_column_privilege('authenticated','public.user_notifications','event_key','SELECT')
    OR has_column_privilege('authenticated','public.user_notifications','user_id','SELECT')
    OR has_column_privilege('authenticated','public.user_notifications','event_key','UPDATE')
    OR has_column_privilege('authenticated','public.user_notifications','opportunity_id','UPDATE')
    OR has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE')
    OR has_column_privilege('authenticated','public.alert_preferences','updated_at','UPDATE')
    OR has_column_privilege('authenticated','public.alert_preferences','updated_at','INSERT')
 THEN RAISE EXCEPTION 'A1.8 unsafe inherited/column privilege'; END IF;

 IF NOT has_column_privilege('authenticated','public.user_notifications','read_at','UPDATE')
    OR NOT has_column_privilege('authenticated','public.user_notifications','dismissed_at','UPDATE')
 THEN RAISE EXCEPTION 'A1.8 expected owner-facing updates denied'; END IF;
END
$a18_verify$;

-- PostgREST caches schema metadata; request reload ONLY on successful COMMIT.
-- The NOTIFY is transaction-scoped and has no effect if the transaction aborts.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- POST-COMMIT OBSERVATION QUERIES ARE IN THE ACCOMPANYING REVIEW RUNBOOK.
-- NO PRODUCTION CHANGES HAVE BEEN EXECUTED OR APPROVED BY THIS FILE.
-- DO NOT ASSUME A BACKUP EXISTS OR THAT USER A/B REAL-JWT TESTS HAVE PASSED.
