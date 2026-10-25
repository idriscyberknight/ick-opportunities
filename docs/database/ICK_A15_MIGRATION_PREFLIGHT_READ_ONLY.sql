-- ICK Opportunities / A1.5 UNIVERSITY REGISTRY — READ-ONLY production audit
-- 2026-10-25. SELECT ONLY; NOT A MIGRATION and NOT to be put in supabase/migrations.
-- Run only against the known ICK Opportunities Lovable Cloud backend after verifying
-- project identity. Do not run against the separate personal Supabase project.
-- Exposes no user emails, JWTs, secrets, or application table rows.
-- Fingerprints are drift indicators, not proof of semantic equality.
WITH registry AS (
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relkind='r'
    AND c.relname IN ('universities','university_aliases',
                      'university_evidence','university_classifications')
),
column_fingerprint AS (
  SELECT COUNT(*) AS col_count,
    md5(string_agg(format('%s:%s:%s:%s',table_name,column_name,udt_name,is_nullable),
                   ',' ORDER BY table_name,ordinal_position)) AS fingerprint
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name IN ('universities','university_aliases',
                       'university_evidence','university_classifications')
),
policy_fingerprint AS (
  SELECT COUNT(*) AS policy_count,
    md5(string_agg(format('%s:%s:%s:%s',tablename,policyname,cmd,qual),
                   ',' ORDER BY tablename,policyname)) AS fingerprint
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename IN ('universities','university_aliases',
                      'university_evidence','university_classifications')
)
SELECT current_database() AS database_name,
       (SELECT COUNT(*) FROM registry) AS registry_tables,
       (SELECT COUNT(*) FROM registry WHERE rls_enabled) AS registry_tables_with_rls,
       (SELECT col_count FROM column_fingerprint) AS registry_columns,
       (SELECT fingerprint FROM column_fingerprint) AS registry_columns_fingerprint,
       (SELECT policy_count FROM policy_fingerprint) AS registry_policies,
       (SELECT fingerprint FROM policy_fingerprint) AS registry_policies_fingerprint,
       (SELECT COUNT(*) FROM supabase_migrations.schema_migrations) AS recorded_migrations,
       (SELECT max(version) FROM supabase_migrations.schema_migrations) AS latest_recorded_migration,
       (SELECT count(*) FROM supabase_migrations.schema_migrations
          WHERE version = '20261008100000') AS c5_filename_migration_version_in_ledger,
       EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conrelid='public.universities'::regclass
           AND conname='universities_no_publishing_yet'
           AND contype='c'
       ) AS publication_check_exists,
       (SELECT COUNT(*) FROM public.universities) AS university_records,
       (SELECT COUNT(*) FROM public.university_aliases) AS alias_records,
       (SELECT COUNT(*) FROM public.university_evidence) AS evidence_records,
       (SELECT COUNT(*) FROM public.university_classifications) AS classification_records,
       has_column_privilege('anon','public.discovery_settings','cron_token','SELECT')
         AS anon_has_cron_token_select,
       has_table_privilege('anon','public.user_roles','TRUNCATE')
         AS anon_has_user_roles_truncate;
-- STOP if any baseline differs. Do not repair ledger versions, apply DDL, or
-- run migration history commands until the actual Lovable deploy runner is known.
