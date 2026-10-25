# A1.4 → A1.5 University Registry: LIVE PRODUCTION SCHEMA BASELINE

**Record date:** 2026-10-25 · **Mode:** historical reconciliation, **not** an executable migration.
**Environment:** ICK-Opportunities Lovable Cloud **Production**, Lovable project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`.
The **separately connected personal Supabase account** project is not this Lovable Cloud DB: **never** generate its types or apply its migrations here.

## What was actually done

The founder specifically approved direct, guarded **Production** creation of four tables from the reviewed:
`docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql`
(blob SHA `7d2babd67284e4b2137a280c0cb62a720ce04f62`).

A transactional BEGIN/preflight/DDL/postcheck/COMMIT was executed directly in Lovable Cloud after an isolated security-staging BEGIN/ROLLBACK test. Independent SELECT verified:
- `public.universities`, `public.university_aliases`, `public.university_evidence`, `public.university_classifications` all **already exist**.
- All four RLS-enabled; 12 admin-only RLS policies; anonymous table SELECT denied.
- `universities_no_publishing_yet` check constraint present (published rows cannot be created).
- Source timestamp trigger helper and FKs exist.
- Users 10, profiles 10, one role assignment, and 14 legacy opportunities were unchanged at post-commit.

Later A1.5 SQL-role validation performed an admin INSERT/UPDATE and non-admin denial in a **ROLLBACK-only** transaction. A subsequent independent SELECT verified all four new tables contain **zero records** and 12 RLS policies remain.

## Why this is NOT a migration to replay

The historical draft file starts with warnings that were correct **before** installation but are now obsolete as historical status. Do not paste it into production again, blindly copy into `supabase/migrations`, or deploy an unguarded `CREATE TABLE`: objects now exist and migration records were **not automatically generated** by this direct SQL change. Doing so would cause collisions or drift.

The correct reconciliation process is:

1. From the authoritative Lovable Cloud **Production** database, read the current schema, constraints, functions, indexes, grants and policies. Record a sanitized schema fingerprint and full catalog evidence without exposing user data.
2. Discover the **actual** Lovable/CLI deployment-runner migration mechanism and recorded migration versions for this same backend. Do NOT assume the standalone user's Supabase project contains the Lovable schema.
3. Choose a reviewed adoption/baseline strategy that recognizes the schema **already present**. An adoption marker should assert the expected schema and do **no DDL** when objects match. If actual migration history cannot be safely written, preserve this historical signed-off baseline document and do not forge a migration.
4. Test the precise strategy on an isolated environment with production-like schema and verify repeat safety, downgrade/rollback ownership and no effect on legacy tables.
5. Get a distinct explicit founder approval before introducing any migration runner change, CLI linking, or production DDL.

## Types and code

New `src/lib/university-registry-schema.types.ts` provides **interim schema-derived, checked against live Production information_schema** definitions for 39 columns in four registry tables. It intentionally does **not** overwrite `src/integrations/supabase/types.ts`, which is generated and currently lacks these four relations.

The A1.5 admin adapter uses `SupabaseClient<UniversityRegistryDatabase>` against that bridge rather than a fully untyped client. This is **not the same as a genuine Supabase-generated file**. Regenerate generated types **from Lovable's correct backend** when available; remove the bridge and update imports only after an exact diff and typecheck.

Added TypeScript verification gate `npm run typecheck` and changed the branch's build script to `npm run typecheck && vite build`. This gate must be green; a prior Vercel `READY` from the old build script did not establish TypeScript validity.

## Security/release boundaries

- **No university data imported** and **no public university publication** under this work.
- No merge of Draft PR #19 or #22 to `main`, no production deployment, no keys/passwords displayed.
- Real signed JWT HTTP admin/ordinary-user test matrix and evidence/review audit trail remain pending.
- A founder screenshot showing "Administrator access required" is UI denial for that session; it alone cannot attest identity of authenticated user or direct REST/RLS behavior.
- Before any merge: confirm typecheck + lint results, exact runtime route, database privilege consistency, and migration adoption plan.


## A1.5 independent reconciliation readback — 2026-10-25

Read-only SQL was executed against the **correct Production** Lovable Cloud project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`.

- Live `public` university tables: four; `university_rows=0`, `alias_rows=0`, `evidence_rows=0`, `classification_rows=0`.
- Postgres **17.6**; university RLS policy count **12**.
- Stable inventory hash of 39 ordered live columns, using `md5(string_agg(format('%s:%s:%s:%s', table_name, column_name, udt_name, is_nullable), ',' ORDER BY table_name, ordinal_position))` = `f28bdcbe5d4d796aea6a11b19dcb4964`.
- Stable current policy hash, using `md5(string_agg(format('%s:%s:%s:%s', tablename, policyname, cmd, qual), ',' ORDER BY tablename, policyname))` = `4de4ac9298e5b4d5ad9f4a87253e33e6`. These fingerprints are for drift checks, not cryptographic proof or a full schema audit.
- `supabase_migrations.schema_migrations` **exists** in this database. Its current ledger contains **13 entries**; the highest version observed is `20261005021810` (2026-10-05). **Zero** migration names contain `universit`; the name column contains opaque UUID-like values. Neither this ledger nor these hashes prove the exact process by which the direct 2026-10-25 DDL was executed or recorded elsewhere. They do support the existing discrepancy: the October 25 registry changes do not appear in the observed dated migration ledger.
- No ledger writes or migration reconciliation operation have been performed. Do **not** insert a new `schema_migrations` record manually or run the historical CREATE TABLE script again.

### Safe next step: adoption strategy only

Get documented ownership of the actual Lovable Cloud migration runner and compare both the code repository and the database migration ledger. Implement a fail-closed **no-op** adoption check if that runner permits it. Require a separate reviewed change and explicit Founder authorization for any migration-ledger alteration; do not fabricate versions, statements or rollback entries.

## A1.5 real signed-session API checks — still pending browser verification

A temporary **preview-only** route `/security/university-registry` has been added on Draft PR #22 to perform four PostgREST `HEAD` requests with the browser's current existing Supabase session after a network-validated `auth.getUser()` call. It deliberately does **not** display JWTs, account identifiers or data rows, and performs **no** inserts, updates, deletes or role changes. Admin and non-admin sign-ins should be exercised independently, and the results remain **inconclusive for row isolation when all registry tables are empty**. The diagnostic route must be removed before any production merge.
