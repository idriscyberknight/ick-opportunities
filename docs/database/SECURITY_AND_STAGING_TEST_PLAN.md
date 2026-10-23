# ICK Opportunities — Phase 3B.3B Security & Staging Test Plan

**Status:** REVIEW ONLY. No database change authorized or executed.
**Date:** 2026-10-23

## Evidence and scope

The founder committed the Phase 3B.3A architecture document into `feat/ick-global-university-database`. It is not on `main` at review time. The current production Lovable database has no new registry tables. The existing helper is `public.has_role(_user_id uuid, _role public.app_role)`.

The SQL draft creates *only* `universities`, `university_aliases`, `university_evidence`, and `university_classifications`, plus supporting indexes and a trigger function. It does not edit existing ICK data. All four tables initially have **admin-only visibility** and no public publication capability. This deliberate fail-closed gate keeps new directories private until an audited publication workflow is ready. Existing static eight-institution frontend cards remain unchanged.

## Critical gates BEFORE attempting any migration

1. Confirm the exact authoritative backing Supabase project/ref for Lovable ICK Opportunities and where migrations are actually applied. A branch, PR, or Vercel Preview is **not** a database clone. The repository `supabase/config.toml` contains a project identifier, but that alone does not prove the live Lovable environment binds to it.
2. Establish a genuinely isolated staging/local PostgreSQL database with compatible Supabase auth schema and helper functions. Capture a restore procedure and backup of the target environment.
3. Ensure this draft has a qualified human review for SQL, policy semantics, naming collisions, dependencies, and migrations history. This draft has not been run by a PostgreSQL parser or staged.
4. Run schema migrations on staging only, confirm tables and indexes, function privileges, defaults, explicit grants, and RLS. Do not merge an executable file under `supabase/migrations` before these gates are met; merging could trigger automatic migration deployment in some workflows.
5. Prepare a separate reviewed server-side publication workflow (enforce approval and current evidence transactionally) and university audit history **before allowing public publication**. Keep existing opportunities publication-policy remediation in its own PR/migration.

## Test matrix — use isolated staging identities

| Persona | Read new tables | Insert university | Update university | Delete university |
|---|---|---|---|---|
| Anonymous | DENIED (no grant, no policy) | DENIED | DENIED | DENIED |
| Normal signed-in user | No rows (admin-only RLS) | DENIED | DENIED | DENIED |
| Signed-in admin | Allowed | Draft only | Allowed; publication blocked by CHECK | DENIED in this stage |
| Service role (server only) | Allowed | Allowed | Publication still blocked by CHECK | Allowed with privileged grants |

Extra security cases:
- Guessing a university UUID as a normal user must not reveal draft record/evidence/alias/classifications.
- Ordinary user cannot insert `review_status='reviewed'` evidence or modify institutional source fields.
- Admin cannot set `publication_status='published'` or non-null `published_at` in this first stage.
- Admin cannot create a classification with an `evidence_id` belonging to a different university.
- `anon` and `authenticated` have NO `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` privileges on these new tables.
- Browser clients cannot execute or modify `ick_university_registry_touch_updated_at()` directly; privileged service credentials never appear in browser JS.
- Existing login, opportunities browser, admin queue and recommender continue to work untouched.

## Read-only verification SQL — AFTER staging migration (not a substitute for persona tests)

```sql
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname IN ('universities','university_aliases','university_evidence','university_classifications');

SELECT tablename,policyname,cmd,roles,qual,with_check
FROM pg_policies WHERE schemaname='public'
AND tablename IN ('universities','university_aliases','university_evidence','university_classifications')
ORDER BY tablename,policyname;

SELECT 'universities' AS table_name,
  has_table_privilege('anon','public.universities','SELECT') AS anon_select,
  has_table_privilege('anon','public.universities','TRUNCATE') AS anon_truncate,
  has_table_privilege('authenticated','public.universities','SELECT') AS signed_in_select,
  has_table_privilege('authenticated','public.universities','DELETE') AS signed_in_delete;
```

**Caution:** The `authenticated` role has a SQL SELECT grant so that admins can query; non-admins still see zero rows due to RLS. A positive `signed_in_select` value is not proof that a normal user can read the data. Test with real authenticated sessions.

## Rollback strategy — staging only

This schema draft does not modify existing tables. Before production, create and review a down migration that removes the registry tables **only if no real data has been entered**. A simple DROP is destructive once records exist; take backups and use an archive/migration-backout approach after real ingestion. Never execute rollback blindly in production.

## Current classification

- **VERIFIED:** Founder branch exists; architecture documentation committed; existing related live tables and admin helper exist.
- **NOT VERIFIED:** Exact deploy target, staging isolation, migration syntax against a live PostgreSQL parser, runtime privileges on new tables, publication workflow, monitoring, backup restoration.
- **NOT PERFORMED:** Any SQL DDL/migration; edits to public opportunities RLS; production deployments; importing eight seed institutions.
