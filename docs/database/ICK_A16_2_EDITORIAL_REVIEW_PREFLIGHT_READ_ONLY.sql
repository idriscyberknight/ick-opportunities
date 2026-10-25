-- ICK OPPORTUNITIES / A1.6.2 / EDITORIAL REVIEW PRE-FLIGHT
-- READ ONLY: SELECT of PostgreSQL catalog and grants. No writes, migrations,
-- SECURITY DEFINER functions, GRANT/REVOKE, role changes or user data.
-- Run ONLY against the authoritative ICK Opportunities Lovable Cloud database.
-- Historical schema DDL is already installed; DO NOT reapply it.
-- Metadata reflects current ACL state, not full per-user RLS authorization.

-- 1. Source-of-truth table/status metadata.
SELECT current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       to_regclass('public.universities') IS NOT NULL AS universities_installed,
       to_regclass('public.university_evidence') IS NOT NULL AS evidence_installed,
       to_regclass('public.university_classifications') IS NOT NULL AS classifications_installed,
       to_regclass('public.university_review_events') IS NOT NULL AS audit_events_installed,
       (SELECT count(*) FROM public.universities) AS university_count,
       (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public'
         AND tablename IN ('universities','university_aliases',
                           'university_evidence','university_classifications')) AS registry_policy_count,
       (SELECT count(*) FROM pg_constraint
         WHERE conname = 'universities_no_publishing_yet'
           AND conrelid = 'public.universities'::regclass
           AND convalidated) AS publication_guards;

-- 2. Sensitive review-state column UPDATE grants.
-- Expected *existing* state on 2026-10-25: all UPDATE grants are true for
-- authenticated because broad table-level UPDATE grant covers the columns.
-- Admin-only RLS is separately enforced; true is NOT Normal User row access.
WITH sensitive_fields(table_name, column_name) AS (
  VALUES
    ('universities','verification_status'),
    ('universities','reviewed_by'),
    ('universities','reviewed_at'),
    ('universities','publication_status'),
    ('universities','published_at'),
    ('university_evidence','review_status'),
    ('university_evidence','checked_by'),
    ('university_evidence','checked_at'),
    ('university_evidence','visibility'),
    ('university_classifications','review_status')
)
SELECT
  table_name,
  column_name,
  has_column_privilege(
    'authenticated',
    ('public.' || table_name)::regclass,
    column_name,
    'UPDATE'
  ) AS authenticated_update_granted,
  has_table_privilege(
    'anon',
    ('public.' || table_name)::regclass,
    'UPDATE'
  ) AS anon_table_update_granted
FROM sensitive_fields
ORDER BY table_name, column_name;

-- 3. Existing registry policies (read only). This lists policy predicates;
-- any apparent Admin-only access must still be tested with signed users.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'universities','university_aliases',
    'university_evidence','university_classifications'
  )
ORDER BY tablename, cmd, policyname;

-- 4. Allowed publication constraints and permission profile; keep
-- publication blocked during all A1.6.2 internal review work.
SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.universities'::regclass
  AND conname = 'universities_no_publishing_yet';

-- END. This file contains no commands that alter data or schema.
