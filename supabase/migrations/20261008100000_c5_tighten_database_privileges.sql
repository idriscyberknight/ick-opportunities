-- =====================================================================
-- C5: Tighten database privileges (anon / authenticated / default privileges)
-- Scope: GRANT/REVOKE only. No RLS policy, table, column or application-code change.
-- Baseline: live ACL snapshot of 2026-10-08 (see docs/security/c5-tighten-database-privileges/).
-- Rollback: docs/security/c5-tighten-database-privileges/rollback.sql (kept outside supabase/migrations on purpose).
-- Atomic: the final DO block raises if the end state is wrong, which aborts the whole migration.
-- If the migration runner already wraps files in a transaction, the explicit BEGIN/COMMIT only warns.
-- =====================================================================
BEGIN;

-- 1. anon: only SELECT on opportunities (rows are still filtered by the RLS policy).
REVOKE ALL ON TABLE
  public.profiles, public.user_opportunity_preferences, public.skills, public.user_skills,
  public.user_interests, public.user_roles, public.saved_opportunities,
  public.application_tracking, public.opportunity_sources, public.opportunity_audit_logs,
  public.discovery_settings, public.discovery_runs, public.discovery_run_sources
FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLE public.opportunities FROM anon;

-- 2. authenticated: privileges no feature uses (TRUNCATE is not covered by RLS).
--    SELECT/UPDATE are deliberately NOT revoked at table level on discovery_settings:
--    that would also wipe its column-level grants.
REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE
  public.profiles, public.user_opportunity_preferences, public.skills, public.user_skills,
  public.user_interests, public.user_roles, public.opportunities, public.saved_opportunities,
  public.application_tracking, public.opportunity_sources, public.opportunity_audit_logs,
  public.discovery_settings, public.discovery_runs, public.discovery_run_sources
FROM authenticated;

-- 3. authenticated: DML no feature or policy needs.
REVOKE DELETE ON public.profiles FROM authenticated;
REVOKE UPDATE, DELETE ON public.skills FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
REVOKE UPDATE ON public.saved_opportunities FROM authenticated;
REVOKE UPDATE, DELETE ON public.opportunity_audit_logs FROM authenticated;
REVOKE INSERT, DELETE ON public.discovery_settings FROM authenticated;
REVOKE DELETE ON public.discovery_runs FROM authenticated;
REVOKE UPDATE, DELETE ON public.discovery_run_sources FROM authenticated;

-- 4. New tables, sequences and functions must not be born open to client roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- 5. Re-assert the intended end state (idempotent; documents the design).
GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_opportunity_preferences TO authenticated;
GRANT SELECT, INSERT ON public.skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_interests TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.saved_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_sources TO authenticated;
GRANT SELECT, INSERT ON public.opportunity_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.discovery_runs TO authenticated;
GRANT SELECT, INSERT ON public.discovery_run_sources TO authenticated;
GRANT SELECT (id, scheduled_enabled, lock_until, updated_at),
      UPDATE (scheduled_enabled, updated_at)
  ON public.discovery_settings TO authenticated;

-- 6. Post-conditions: any failure raises and aborts the whole migration.
DO $$
DECLARE
  t record;
  problems text[] := ARRAY[]::text[];
BEGIN
  FOR t IN
    SELECT c.oid, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
  LOOP
    IF t.relname = 'opportunities' THEN
      IF NOT has_table_privilege('anon', t.oid, 'SELECT') THEN
        problems := problems || 'anon lost SELECT on opportunities';
      END IF;
      IF has_table_privilege('anon', t.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
        problems := problems || 'anon still has extra privileges on opportunities';
      END IF;
    ELSIF has_table_privilege('anon', t.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
      problems := problems || format('anon still has a privilege on public.%s', t.relname);
    END IF;
    IF has_table_privilege('authenticated', t.oid, 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') THEN
      problems := problems || format('authenticated still has TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on public.%s', t.relname);
    END IF;
  END LOOP;

  IF has_column_privilege('anon', 'public.discovery_settings', 'cron_token', 'SELECT,INSERT,UPDATE') THEN
    problems := problems || 'anon can access discovery_settings.cron_token';
  END IF;
  IF has_column_privilege('authenticated', 'public.discovery_settings', 'cron_token', 'SELECT,INSERT,UPDATE') THEN
    problems := problems || 'authenticated can access discovery_settings.cron_token';
  END IF;
  IF has_table_privilege('authenticated', 'public.user_roles', 'INSERT,UPDATE,DELETE') THEN
    problems := problems || 'authenticated can write user_roles';
  END IF;
  IF has_table_privilege('authenticated', 'public.opportunity_audit_logs', 'UPDATE,DELETE') THEN
    problems := problems || 'authenticated can alter audit logs';
  END IF;
  IF has_table_privilege('authenticated', 'public.discovery_settings', 'INSERT,DELETE') THEN
    problems := problems || 'authenticated can insert/delete discovery_settings';
  END IF;

  -- Required privileges must still exist.
  FOR t IN SELECT * FROM (VALUES
    ('authenticated','public.opportunities','SELECT'), ('authenticated','public.opportunities','INSERT'),
    ('authenticated','public.opportunities','UPDATE'), ('authenticated','public.opportunities','DELETE'),
    ('authenticated','public.profiles','SELECT'), ('authenticated','public.profiles','INSERT'),
    ('authenticated','public.profiles','UPDATE'),
    ('authenticated','public.user_opportunity_preferences','DELETE'), ('authenticated','public.user_opportunity_preferences','INSERT'),
    ('authenticated','public.skills','SELECT'), ('authenticated','public.skills','INSERT'),
    ('authenticated','public.user_skills','DELETE'), ('authenticated','public.user_skills','INSERT'),
    ('authenticated','public.user_interests','DELETE'), ('authenticated','public.user_interests','INSERT'),
    ('authenticated','public.user_roles','SELECT'),
    ('authenticated','public.saved_opportunities','INSERT'), ('authenticated','public.saved_opportunities','DELETE'),
    ('authenticated','public.application_tracking','INSERT'), ('authenticated','public.application_tracking','UPDATE'),
    ('authenticated','public.application_tracking','DELETE'),
    ('authenticated','public.opportunity_sources','INSERT'), ('authenticated','public.opportunity_sources','UPDATE'),
    ('authenticated','public.opportunity_sources','DELETE'),
    ('authenticated','public.opportunity_audit_logs','SELECT'), ('authenticated','public.opportunity_audit_logs','INSERT'),
    ('authenticated','public.discovery_runs','INSERT'), ('authenticated','public.discovery_runs','UPDATE'),
    ('authenticated','public.discovery_run_sources','INSERT'),
    ('service_role','public.discovery_settings','SELECT'), ('service_role','public.opportunities','INSERT')
  ) AS v(role_name, tbl, priv)
  LOOP
    IF NOT has_table_privilege(t.role_name, t.tbl, t.priv) THEN
      problems := problems || format('%s lost %s on %s', t.role_name, t.priv, t.tbl);
    END IF;
  END LOOP;

  IF NOT (has_column_privilege('authenticated', 'public.discovery_settings', 'scheduled_enabled', 'SELECT')
      AND has_column_privilege('authenticated', 'public.discovery_settings', 'scheduled_enabled', 'UPDATE')
      AND has_column_privilege('authenticated', 'public.discovery_settings', 'lock_until', 'SELECT')
      AND has_column_privilege('authenticated', 'public.discovery_settings', 'updated_at', 'UPDATE')) THEN
    problems := problems || 'authenticated lost discovery_settings column privileges';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace,
      LATERAL aclexplode(d.defaclacl) x
    WHERE n.nspname = 'public' AND d.defaclrole = 'postgres'::regrole::oid
      AND x.grantee = ANY (ARRAY['anon'::regrole::oid, 'authenticated'::regrole::oid])
  ) THEN
    problems := problems || 'default privileges in public still grant to anon/authenticated';
  END IF;

  IF array_length(problems, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'C5 privilege assertions failed: %', array_to_string(problems, '; ');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
