-- C5 rollback. Generated from the live ACL snapshot of 2026-10-08, BEFORE any revoke.
-- Restores the exact pre-C5 state, including the exposure (anon ALL, cron_token column privilege for anon).
-- Emergency use only. Do NOT move this file into supabase/migrations: it would run as a migration.
BEGIN;

GRANT ALL ON TABLE
  public.profiles, public.user_opportunity_preferences, public.skills, public.user_skills,
  public.user_interests, public.user_roles, public.opportunities, public.saved_opportunities,
  public.application_tracking, public.opportunity_sources, public.opportunity_audit_logs,
  public.discovery_settings, public.discovery_runs, public.discovery_run_sources
TO anon;

GRANT ALL ON TABLE
  public.profiles, public.user_opportunity_preferences, public.skills, public.user_skills,
  public.user_interests, public.user_roles, public.opportunities, public.saved_opportunities,
  public.application_tracking, public.opportunity_sources, public.opportunity_audit_logs,
  public.discovery_runs, public.discovery_run_sources
TO authenticated;

-- discovery_settings keeps its column-level SELECT/UPDATE; restore only the old table-level extras.
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.discovery_settings TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
