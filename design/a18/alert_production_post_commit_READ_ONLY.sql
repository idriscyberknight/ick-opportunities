-- A1.8 ICK Opportunities — AFTER-APPROVED-MIGRATION verification only
-- READ-ONLY SELECT. This file MUST NOT be used to create/alter/drop anything.
-- Database target: Lovable Production project 433a53c8-8872-49f2-b7b8-3e8dc7e96e35.
-- This query requires the two A1.8 tables to ALREADY exist.
-- It reports Boolean checks; it does NOT establish real signed-user JWT safety.
-- Never run as an instruction to apply the adjacent review-only DDL.
WITH checks(label, passed) AS (
  VALUES
    ('preferences_RLS', (
      SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'public.alert_preferences'::regclass)),
    ('notifications_RLS', (
      SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = 'public.user_notifications'::regclass)),
    ('exactly_six_alert_RLS_policies', (
      SELECT COUNT(*) = 6 FROM pg_policies
      WHERE schemaname = 'public' AND tablename IN ('alert_preferences','user_notifications'))),
    ('preferences_default_consent_OFF', (
      SELECT pg_get_expr(d.adbin, d.adrelid) IN ('false', 'false::boolean')
      FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum
      WHERE d.adrelid='public.alert_preferences'::regclass AND a.attname='enabled')),
    ('anon_cannot_SELECT_preferences', NOT has_table_privilege(
      'anon', 'public.alert_preferences', 'SELECT')),
    ('anon_cannot_SELECT_notifications', NOT has_table_privilege(
      'anon', 'public.user_notifications', 'SELECT')),
    ('auth_can_SELECT_preferences', has_table_privilege(
      'authenticated', 'public.alert_preferences', 'SELECT')),
    ('auth_cannot_INSERT_notifications', NOT has_table_privilege(
      'authenticated', 'public.user_notifications', 'INSERT')),
    ('auth_cannot_DELETE_notifications', NOT has_table_privilege(
      'authenticated', 'public.user_notifications', 'DELETE')),
    ('auth_cannot_TRUNCATE_notifications', NOT has_table_privilege(
      'authenticated', 'public.user_notifications', 'TRUNCATE')),
    ('auth_cannot_SELECT_notifications_ALL_columns', NOT has_table_privilege(
      'authenticated', 'public.user_notifications', 'SELECT')),
    ('auth_can_SELECT_notification_id', has_column_privilege(
      'authenticated', 'public.user_notifications', 'id', 'SELECT')),
    ('auth_cannot_SELECT_event_key', NOT has_column_privilege(
      'authenticated', 'public.user_notifications', 'event_key', 'SELECT')),
    ('auth_cannot_SELECT_notification_user_id', NOT has_column_privilege(
      'authenticated', 'public.user_notifications', 'user_id', 'SELECT')),
    ('auth_cannot_UPDATE_notification_owner', NOT has_column_privilege(
      'authenticated', 'public.user_notifications', 'user_id', 'UPDATE')),
    ('auth_cannot_UPDATE_event_key', NOT has_column_privilege(
      'authenticated', 'public.user_notifications', 'event_key', 'UPDATE')),
    ('auth_can_mark_read', has_column_privilege(
      'authenticated', 'public.user_notifications', 'read_at', 'UPDATE')),
    ('auth_can_dismiss', has_column_privilege(
      'authenticated', 'public.user_notifications', 'dismissed_at', 'UPDATE')),
    ('auth_cannot_forge_pref_updated_at', NOT has_column_privilege(
      'authenticated', 'public.alert_preferences', 'updated_at', 'UPDATE')),
    ('unique_notification_event_key', EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.user_notifications'::regclass
        AND conname = 'a18_unique_user_event' AND contype = 'u')),
    ('pref_stamp_trigger', EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.alert_preferences'::regclass
        AND tgname = 'a18_preferences_updated' AND NOT tgisinternal)),
    ('notification_stamp_trigger', EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.user_notifications'::regclass
        AND tgname = 'a18_notification_action_timestamps' AND NOT tgisinternal))
)
SELECT jsonb_build_object(
  'suite', 'A1.8 approved Production migration post-commit read-only check',
  'status', CASE WHEN COUNT(*) = 22 AND bool_and(COALESCE(passed,false))
            THEN 'PASS' ELSE 'FAIL' END,
  'checked', COUNT(*),
  'checks', jsonb_object_agg(label, COALESCE(passed,false))
)::text
FROM checks;

-- NOTE: no proof of RLS account isolation from a privileged SQL SELECT.
-- Genuine signed User A/B / anon HTTP checks must be performed separately,
-- without exposing their passwords/JWTs. No data rows are selected here.
