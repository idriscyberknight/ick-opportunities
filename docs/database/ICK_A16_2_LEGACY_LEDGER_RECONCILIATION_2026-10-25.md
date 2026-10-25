# ICK Opportunities — A1.6.2 Legacy Migration Ledger Reconciliation

**Observation date:** 2026-10-25  
**Mode:** Read-only Lovable Cloud + Git-synced file inventory; **no migration execution, data manipulation, Lovable agent messages, or history repair.**  
**Backend of record:** ICK Opportunities Lovable Cloud project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35` (do not substitute the founder's separately connected Supabase account).  
**Production source baseline:** Vercel and Lovable project at `bd811d8c2000d19aa72f2cd91fba8cf3e4c4560a`.

## 1. Exact historical migration inventory: **13 / 13 name matches**

A fresh Lovable **source tree listing** returned 184 project files across two pages, including exactly **14** `supabase/migrations/*.sql` files, and no `drizzle/migrations/` file. A fresh Lovable Cloud Production **SELECT-only** SQL query listed all **13** rows of `supabase_migrations.schema_migrations` (`version`, `name`). For every live ledger row, a source file exists with the exact filename prefix `<version>_<name>.sql`.

| Production ledger version | Git-synced filename suffix | Result |
| --- | --- | --- |
| `20260902002829` | `3b9b6bf3-69da-49b0-8fb8-8a4f33162808` | MATCH |
| `20260902002837` | `0a351569-8d48-496f-aa6c-8a00bd94bfc3` | MATCH |
| `20260903020704` | `9c958a4c-3ad1-4e08-a971-63b16677c41c` | MATCH |
| `20260904011034` | `0bbc687a-4920-445e-b959-b0a6f9b30207` | MATCH |
| `20260904011046` | `f6bf51cb-ff57-4594-96d3-ea6278bd1383` | MATCH |
| `20260905134712` | `f0143b6a-bbf5-4e50-8cb9-907a07a01bb9` | MATCH |
| `20260906000154` | `201e439c-406b-4dd7-85ae-bddc33597bb6` | MATCH |
| `20261001145456` | `95e87d5f-22f6-4887-9a74-59933b33fa55` | MATCH |
| `20261002001124` | `e9ed979e-0ae3-42cc-bab7-40845f4e49e2` | MATCH |
| `20261002002842` | `d03f9e84-2892-43e1-abff-0275042038cf` | MATCH |
| `20261002002853` | `17682e38-e87d-441c-a1df-5f889f4a0c3b` | MATCH |
| `20261004040332` | `182fe793-4527-4390-ae6b-16e268017795` | MATCH |
| `20261005021810` | `2e7a183e-3104-4a68-850b-3cd3d4c86c01` | MATCH |

**Result:** `13/13 name-version pairs match; 0 recorded migrations without a matching repository filename`. Matching file names **do not prove** that the live schema is exactly the full cumulative effect of the current file bytes, that the SQL file has not changed since original application, or that content hashes were audited.

## 2. Two distinct untracked changes — NOT safe to replay

**Gap C5:** One unrecorded file exists at `supabase/migrations/20261008100000_c5_tighten_database_privileges.sql`; zero live ledger rows have version `20261008100000`. Prior independent Production read-only C5 final privilege assertions (12 categories) all passed, which proves **current effective privilege outcomes**, not that this exact C5 migration was run. Do not replay C5, fabricate a ledger row, or assume the source file is already a registered migration.

**Gap A1.4:** Four existing University Registry tables were installed through previously approved direct SQL and recorded in `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql`, NOT an installed migration ledger entry. Four RLS-enabled tables, 12 policies, 39 columns, and publishing CHECK were verified. Current live registry contains one private pending draft, one alias, one unreviewed evidence row. **Do not rerun CREATE TABLE or overwrite these records.**

**Interpretation:** The first 13 historical migrations have a good *filename-to-ledger* reconciliation. The C5 and A1.4 gaps remain **history/adoption gaps**. This is not a completed migration-ledger reconciliation of the entire live database.

## 3. Legacy runner / authoritative database boundary

**Project-specific observations:**
- Current source is a legacy `supabase/migrations/` tree. `supabase/config.toml` declares `project_id = "xzxfodukvzzfwbwokhxt"`, but this text **does not establish ownership of the current Lovable Cloud database or authorize `supabase db push`**.
- The connected Lovable Cloud backend is managed by Lovable, not by the founder's separate Supabase account. A personal Supabase dashboard project should not be used for schema repair or app migrations.
- Official Lovable database docs say project-chat database changes are applied by Lovable and migration files added to the code; modern projects use Drizzle while legacy projects may retain `supabase/migrations/`.
- Official Lovable Git sync docs: commits **do not automatically execute migration files**. Lovable documents **project-chat change with approval** or **SQL editor** as deployment mechanisms. The exact way this legacy project's internal migration ledger adopts directly installed SQL has **not** been verified.
- Previously approved read-only engagement constraints prohibit sending Lovable agent messages, writing Production SQL or spending Lovable code credits; no such action occurred here.

**Primary sources (checked 2026-10-25):**
- https://docs.lovable.dev/features/database
- https://docs.lovable.dev/integrations/git-sync-overview
- https://supabase.com/kb/troubleshooting/cant-access-supabase-project-lovable-cloud
- Previous `docs/database/ICK_A15_MIGRATION_RECONCILIATION_FINDINGS_2026-10-25.md`

## 4. Concrete decision tree before any A1.6.2 Production migration

1. **Confirm supported legacy runner for this exact Lovable Cloud project** with project-owner/vendor-supported documentation. No external Supabase CLI assumptions.
2. **C5:** Compare all intended current grants/default ACLs to the effective end-state (previous 12-category audit PASS). Record it as installed/verified state without replaying the C5 file. How the ledger should represent that fact remains pending vendor guidance.
3. **A1.4:** Make the installed four-table schema an immutable snapshot: columns/types/nullability/constraints/triggers/functions/GRANT/default GRANT/RLS/policies; do not run the historical source DDL.
4. **Recovery:** founder reports full encrypted/private export completed; independent archive inspection and isolated `pg_restore` rehearsal remain unverified. Do not upload the archive to GitHub/ChatGPT.
5. **A1.6.2 migration:** create a **new, separately approved and versioned** additive migration using a vendor-supported workflow, with role/ACL checks and precondition fingerprints. Failing any precondition must abort. Design a post-COMMIT containment and recovery path.
6. **Release sequencing:** PR #28's review-submission gate stays disabled while deploying compatible safe-field frontend; deploy secure backend only after separate approval; independently verify actual real JWT authorization before a distinct approved frontend gate activation.
7. **No publication:** maintain `universities_no_publishing_yet`, no public-read policy, no auto-verified universities or scholarship claims.

**STOP conditions:** Unknown runner / schema difference / unexpected private records / unverified restore / failed RLS or dependency tests / mismatched migration baseline => do not execute any production DDL. Ask for exact Founder approval once all prerequisites are evidenced.

## 5. Probe tool limit, accuracy and next evidence

After the 13-row ledger was successfully read, a **further** read-only SQL metadata probe was **not executed**: the Lovable MCP endpoint returned `free-plan MCP database action limit reached`. Consequently, we **have not independently rechecked** live `drizzle.__drizzle_migrations` existence, and must not infer its absence solely from the source tree layout. The prior observed Production state and successful ledger query remain our most recent evidence. Do not repeat queries simply to beat the quota; no migration is urgent enough to justify bypassing provider limits.

**Decision:** `13/13 historical migration filenames MATCH = PASS`; `C5 ledger = UNRECORDED`; `A1.4 installed DDL ledger = UNRECORDED`; `authoritative adoption runner and restore = NOT VERIFIED`; `A1.6.2 Production migration = ON HOLD`.

This report contains only project architecture and registry aggregate counts; no user emails, credentials, secret tokens, row-level private source data or database export.
