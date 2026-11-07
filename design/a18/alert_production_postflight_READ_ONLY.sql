-- ICK Opportunities A1.8 Production migration postflight (READ-ONLY).
-- Run ONLY AFTER a separately approved Production migration was completed.
-- DO NOT execute this file before migration: it intentionally references
-- the future alert tables. Does not INSERT/UPDATE/DELETE/CREATE/GRANT.
-- NEVER use a successful catalog check as proof of real signed JWT isolation.
SELECT jsonb_build_object(
  'checked_at_utc', current_timestamp AT TIME ZONE 'UTC',
  'expected_objects', jsonb_build_object(
    'alert_preferences', to_regclass('public.alert_preferences') IS NOT NULL,
    'user_notifications', to_regclass('public.user_notifications') IS NOT NULL,
    'stamp_preferences', to_regprocedure('public.a18_preferences_stamp_updated()') IS NOT NULL,
    'stamp_actions', to_regprocedure('public.a18_notification_stamp_actions()') IS NOT NULL
  ),
  'alert_tables_rls',
    (SELECT jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity)
                      ORDER BY c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relname IN ('alert_preferences','user_notifications')
       AND c.relkind IN ('r','p')),
  'policies',
    (SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',policyname,'command',cmd)
                      ORDER BY tablename,policyname)
     FROM pg_policies WHERE schemaname='public'
       AND tablename IN ('alert_preferences','user_notifications')),
  'policy_count',
    (SELECT count(*) FROM pg_policies WHERE schemaname='public'
       AND tablename IN ('alert_preferences','user_notifications')),
  'non_internal_auth_privileges', jsonb_build_object(
    'anon_select_preferences',
      has_table_privilege('anon','public.alert_preferences','SELECT'),
    'anon_select_notifications',
      has_table_privilege('anon','public.user_notifications','SELECT'),
    'auth_select_preferences',
      has_table_privilege('authenticated','public.alert_preferences','SELECT'),
    'auth_insert_notifications',
      has_table_privilege('authenticated','public.user_notifications','INSERT'),
    'auth_delete_notifications',
      has_table_privilege('authenticated','public.user_notifications','DELETE'),
    'auth_truncate_notifications',
      has_table_privilege('authenticated','public.user_notifications','TRUNCATE'),
    'auth_read_notification_id',
      has_column_privilege('authenticated','public.user_notifications','id','SELECT'),
    'auth_read_event_key',
      has_column_privilege('authenticated','public.user_notifications','event_key','SELECT'),
    'auth_read_notification_user_id',
      has_column_privilege('authenticated','public.user_notifications','user_id','SELECT'),
    'auth_change_notification_user_id',
      has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE'),
    'auth_mark_read',
      has_column_privilege('authenticated','public.user_notifications','read_at','UPDATE'),
    'auth_dismiss',
      has_column_privilege('authenticated','public.user_notifications','dismissed_at','UPDATE'),
    'auth_change_preferences_timestamp',
      has_column_privilege('authenticated','public.alert_preferences','updated_at','UPDATE')
  ),
  'stamp_triggers',
    (SELECT jsonb_agg(jsonb_build_object('table',c.relname,'trigger',t.tgname)
                      ORDER BY c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON t.tgrelid=c.oid
     JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public'
       AND c.relname IN ('alert_preferences','user_notifications')
       AND NOT t.tgisinternal),
  'rows', jsonb_build_object(
    'preferences', (SELECT count(*) FROM public.alert_preferences),
    'notifications', (SELECT count(*) FROM public.user_notifications)
  ),
  'opt_in_default',
    (SELECT column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name='alert_preferences' AND column_name='enabled'),
  'existing_opportunities',
    (SELECT count(*) FROM public.opportunities)
) AS a18_postflight;
-- Expected for brand-new migration: BOTH tables RLS=true; policies=6;
-- prefs default false; no anon SELECT; authenticated notification INSERT,
-- DELETE, TRUNCATE, event_key SELECT and user_id SELECT denied; read_at and
-- dismissed_at column UPDATE allowed; both new tables initially have 0 rows.
-- IMPORTANT: Account A/B live signed-session PostgREST isolation must be tested
-- separately; this query reports only PostgreSQL privileges and metadata.
