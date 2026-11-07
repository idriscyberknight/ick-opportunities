DO $pre$
BEGIN
  IF to_regclass('public.alert_preferences') IS NOT NULL OR to_regclass('public.user_notifications') IS NOT NULL
  THEN RAISE EXCEPTION 'A1.8 STOP: alert objects already exist; do not replay'; END IF;
  IF to_regclass('public.opportunities') IS NULL OR to_regclass('public.saved_opportunities') IS NULL OR to_regclass('public.profiles') IS NULL
  THEN RAISE EXCEPTION 'A1.8 STOP: required tables missing'; END IF;
END $pre$;

CREATE TABLE public.alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  CONSTRAINT a18_pref_timezone_shape CHECK (
    length(timezone) BETWEEN 3 AND 64
    AND timezone ~ '^[A-Za-z][A-Za-z0-9_+.-]*/[A-Za-z][A-Za-z0-9_+./-]*$'
  )
);

CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL CONSTRAINT a18_notification_kind_check CHECK (kind IN ('new_match','saved_deadline')),
  event_key text NOT NULL CONSTRAINT a18_event_key_check CHECK (length(event_key) BETWEEN 1 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT a18_unique_user_event UNIQUE (user_id,event_key)
);
CREATE INDEX a18_notifications_user_created_idx ON public.user_notifications(user_id,created_at DESC);
CREATE INDEX a18_notifications_unread_idx ON public.user_notifications(user_id,read_at) WHERE dismissed_at IS NULL;

CREATE FUNCTION public.a18_preferences_stamp_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $fn$
BEGIN
  NEW.updated_at := transaction_timestamp();
  RETURN NEW;
END
$fn$;
CREATE TRIGGER a18_preferences_updated BEFORE UPDATE ON public.alert_preferences
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
CREATE TRIGGER a18_notification_action_timestamps BEFORE UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.a18_notification_stamp_actions();

REVOKE ALL ON TABLE public.alert_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.a18_preferences_stamp_updated() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.a18_notification_stamp_actions() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.alert_preferences TO authenticated;
GRANT INSERT (user_id,enabled,new_matches_enabled,saved_deadlines_enabled,categories,minimum_match_score,deadline_lead_days,timezone)
  ON public.alert_preferences TO authenticated;
GRANT UPDATE (enabled,new_matches_enabled,saved_deadlines_enabled,categories,minimum_match_score,deadline_lead_days,timezone)
  ON public.alert_preferences TO authenticated;
GRANT DELETE ON TABLE public.alert_preferences TO authenticated;
GRANT SELECT (id,opportunity_id,kind,created_at,read_at,dismissed_at) ON public.user_notifications TO authenticated;
GRANT UPDATE (read_at,dismissed_at) ON public.user_notifications TO authenticated;
GRANT ALL ON TABLE public.alert_preferences TO service_role;
GRANT ALL ON TABLE public.user_notifications TO service_role;

ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY a18_preferences_owner_select ON public.alert_preferences
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_insert ON public.alert_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_update ON public.alert_preferences
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY a18_preferences_owner_delete ON public.alert_preferences
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY a18_notifications_safe_owner_select ON public.user_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.alert_preferences p WHERE p.user_id = (SELECT auth.uid()) AND p.enabled)
    AND EXISTS (
      SELECT 1 FROM public.opportunities o
       WHERE o.id = user_notifications.opportunity_id
         AND o.status = 'active'::public.opportunity_status
         AND o.verified_status = 'verified'::public.verified_status
         AND o.reviewed_by IS NOT NULL AND o.reviewed_at IS NOT NULL
         AND o.published_at IS NOT NULL AND o.published_at <= now()
         AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    )
  );

CREATE POLICY a18_notifications_safe_owner_update ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.alert_preferences p WHERE p.user_id = (SELECT auth.uid()) AND p.enabled)
    AND EXISTS (
      SELECT 1 FROM public.opportunities o
       WHERE o.id = user_notifications.opportunity_id
         AND o.status = 'active'::public.opportunity_status
         AND o.verified_status = 'verified'::public.verified_status
         AND o.reviewed_by IS NOT NULL AND o.reviewed_at IS NOT NULL
         AND o.published_at IS NOT NULL AND o.published_at <= now()
         AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
    )
  )
  WITH CHECK (user_id = (SELECT auth.uid()));

DO $verify$
BEGIN
 IF has_table_privilege('anon','public.alert_preferences','SELECT')
    OR has_table_privilege('anon','public.user_notifications','SELECT')
    OR has_table_privilege('authenticated','public.user_notifications','INSERT')
    OR has_table_privilege('authenticated','public.user_notifications','DELETE')
    OR has_column_privilege('authenticated','public.user_notifications','event_key','SELECT')
    OR has_column_privilege('authenticated','public.user_notifications','user_id','SELECT')
    OR has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE')
 THEN RAISE EXCEPTION 'A1.8 unsafe privilege'; END IF;
END $verify$;

NOTIFY pgrst, 'reload schema';