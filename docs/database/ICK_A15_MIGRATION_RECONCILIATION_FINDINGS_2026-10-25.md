# ICK Opportunities — A1.5 migration reconciliation findings (read-only)

**Date:** 2026-10-25
**Scope:** Lovable Cloud Production registry and historical migration ledger; GitHub PR #22 is still Draft, with NO merge.
**Status:** EVIDENCE GATHERED, HISTORY RECONCILIATION NOT YET EXECUTED.

## 1. Authoritative Production: independently queried

Backend: existing ICK Opportunities Lovable Cloud project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`.
All queries here are **SELECT only**, with no migration, DDL, profile, opportunity or user writes.

| Production readback | Verified value |
|---|---|
| PostgreSQL version (earlier audit) | 17.6 |
| `supabase_migrations.schema_migrations` entries | 13 |
| Latest recorded version | `20261005021810` |
| Exact `20261008100000` migration version in ledger | 0 |
| Registry tables in `public` | 4 |
| Registry RLS-enabled tables | 4 |
| Registry columns | 39 |
| Registry RLS policies | 12 |
| Registry records in four tables | 0 / 0 / 0 / 0 |
| `universities_no_publishing_yet` CHECK constraint present | true |
| `anon` can SELECT protected `discovery_settings.cron_token` | false |
| `anon` can TRUNCATE `user_roles` | false |

Fingerprint of ordered registry column metadata: `f28bdcbe5d4d796aea6a11b19dcb4964`.
Fingerprint of current registry policy metadata: `4de4ac9298e5b4d5ad9f4a87253e33e6`.

**Reusable read-only query:** `docs/database/ICK_A15_MIGRATION_PREFLIGHT_READ_ONLY.sql`.
That exact SQL file was executed against connected Production successfully and returned the values above.

## 2. Git repository versus recorded migration history

The Lovable project's source tree currently contains **14 files** under `supabase/migrations`:
- **13** older timestamped SQL files from `20260902002829` to `20261005021810` (all 13 timestamp prefixes match the ledger's exact list).
- **1 additional migration file:** `supabase/migrations/20261008100000_c5_tighten_database_privileges.sql` (**not represented in the observed ledger**).

The missing C5 ledger entry **does not prove its privilege changes were never applied**: live grants/defaults already match a number of C5's desired restrictions, including zero `anon` TRUNCATE grants and zero `authenticated` TRUNCATE grants across 18 public tables, `cron_token` SELECT denied to both client roles, and no `anon` SELECT grants on public tables other than `opportunities`. This is evidence of the **current privilege posture**, not definitive evidence of the migration's execution mechanism or the complete post-condition set.

Separately, the four A1.4 University Registry tables were installed in Production via previously Founder-approved **direct SQL** on 2026-10-25 using the reviewed historical `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql`. That DDL has **no new migration ledger row** and is **not** a timestamped `supabase/migrations` file. **Do not replay it.**

Repo `supabase/config.toml` contains `project_id = "xzxfodukvzzfwbwokhxt"`. A config value is **not independent proof** of the live Production endpoint or which deployment runner manages the Lovable Cloud database. Validate the actual target and owner before ever running migrations. Do not substitute the separately connected personal Supabase project.

## 3. Facts versus unknowns

**VERIFIED:** exact ledger version set; source migration file inventory; C5 version not recorded; installed registry; policy/privilege snapshot; no registry rows; historical schema drift documented.

**UNKNOWN:** whether C5 SQL was manually executed outside the ledger, in whole or part; whether Lovable has an additional proprietary migration state outside `supabase_migrations.schema_migrations`; which actor and CI path would apply future SQL to this exact Lovable Cloud Production backend; whether external type generation uses the matching project reference.

**NOT AUTHORIZED:** writing to `supabase_migrations`; `supabase migration repair`, `db push`, `db reset`, `CREATE TABLE`, privilege changes, or any app Production deployment.

## 4. Zero-write adoption decision plan

1. **Confirm authoritative runner** via Lovable's project connection/deployment documentation and owner settings (read-only), then read its recorded version inventory. Avoid linking a different Supabase account.
2. **Classify the C5 gap**: inspect full current ACL, function and default ACL state against the existing C5 `audit.sql` before deciding whether it is merely untracked or partly absent.
3. **Classify the Registry gap**: compare actual table/constraint/function/trigger/grant/policy definitions against the historical reviewed SQL, not just object names and hashes.
4. **Design an adoption baseline** for an already-installed schema; require a clear runner-supported procedure. Ensure applying it to identical state is no-op and applying to drift fails closed. Do not forge migration history.
5. **Validate the plan only in isolated staging** with controlled rollback and verified backup/recovery before any Production ledger or schema change.
6. Obtain **a separate explicit Founder decision** for the approved technical procedure and Production deployment. Do not merge this Draft PR as a side effect.

**A1.5 code quality:** current branch has a scoped typed registry bridge instead of genuinely regenerated Lovable types; last build + strict TypeScript + scoped ESLint passed; legacy global lint errors remain report-only. Admin and non-admin real-JWT `HEAD` read-only API reachability tests were completed, temporary diagnostic route was removed, but real-JWT write-denial and nonempty-record isolation tests remain unproven.

## Decision summary

**Migration history is NOT yet reconciled.** The accurate milestone is *migration discrepancy identified and documented with reproducible read-only evidence*. That is a prerequisite to planning adoption, **not** a certificate to run SQL or merge.


## 5. Runner behavior and full C5 security postcondition check (2026-10-25)

### A. Official Lovable behavior: narrowed from general unknown to a documented boundary

Authoritative public docs, checked 2026-10-25:
- [Lovable — Database: how Lovable changes your database structure](https://docs.lovable.dev/features/database): Lovable project-chat schema changes are applied by Lovable, accompanied by generated types and recorded migration files. Current projects use `drizzle/migrations/`; older projects may retain `supabase/migrations/`.
- [Lovable — Git sync: backend files in commits](https://docs.lovable.dev/integrations/git-sync-overview): **merging/syncing code does NOT run migration files**. To change database structure, use a separately reviewed Lovable project-chat request or the SQL editor. A Git branch does not create an isolated database.
- [Supabase — Lovable Cloud owned database limitations](https://supabase.com/kb/troubleshooting/cant-access-supabase-project-lovable-cloud): the Lovable-managed backend is distinct from the user's own Supabase dashboard projects.

Actual Lovable project file listing (read-only): 172 files; **14** `supabase/migrations/` SQL files; **no** `drizzle/` tree or `drizzle.config.ts` currently. Therefore this is a **legacy Supabase-migration source layout**; importing a new Drizzle workflow by assumption would be wrong. The existence of `supabase_migrations.schema_migrations` supports a Supabase-style historical ledger, but **its maintenance behavior for direct SQL editor operations is not independently established**.

GitHub PR #22 changed-filename inspection (read-only): **12 changed files**, consisting of UI, typed adapter, docs, workflow and `package.json`/`vite.config.ts`. **Zero modifications under `supabase/migrations/`** and none under `drizzle/migrations/`. The historical SQL draft in `docs/database/` was changed only to add a **DO NOT RE-RUN** warning in its header; no executable schema change is proposed in PR #22. Git merge cannot itself be relied on to register A1.4 or C5 in the live ledger.

### B. C5 full SQL assertion matrix — all 12 categories PASS

A separate **SELECT-only** audit on the exact live Lovable Cloud Production backend checked the original C5 migration file's SQL assertion logic. ALL returned `true`:
1. `anon` can SELECT `opportunities`.
2. `anon` has no extra `opportunities` privileges.
3. `anon` has no privileges on other exposed public relations (tables/views examined).
4. `authenticated` has no TRUNCATE/REFERENCES/TRIGGER/MAINTAIN privileges on public relations.
5. `anon` cannot SELECT/INSERT/UPDATE `discovery_settings.cron_token`.
6. `authenticated` cannot SELECT/INSERT/UPDATE that protected column.
7. `authenticated` cannot INSERT/UPDATE/DELETE `user_roles`.
8. `authenticated` cannot UPDATE/DELETE `opportunity_audit_logs`.
9. `authenticated` cannot INSERT/DELETE `discovery_settings`.
10. Required whitelisted `discovery_settings` column privileges remain.
11. No default ACL entries in `public` grant `anon`/`authenticated` privileges via `postgres`.
12. All **31** expressly required privileges for existing features/service role remain.

**Evidence-based conclusion:** CURRENT **C5 EFFECTIVE PERMISSIONS = PASS**, and **C5 MIGRATION LEDGER VERSION = MISSING**. Do not confuse them. The live database presently satisfies the checked C5 end-state assertions, **even though we cannot establish how, when, or by whom the ACLs were set**. Do NOT execute the C5 SQL just to obtain a ledger row; that could cause drift and side effects. Do not insert ledger rows manually.

### C. Release ownership and exit criteria

- **A1.5 PR #22 is a code-only merge with respect to migrations:** its code reads/writes previously installed Registry schema; it does not propose a new runnable migration. The unresolved ledger gap therefore represents historical auditability and future migration drift risk, **not evidence that the existing registry schema is absent**.
- **Required for any future schema migration:** verify the authoritative Lovable runner/permissions and compare ALL live schema objects, define a properly reviewed migration adoption plan in isolated staging, then obtain explicit approval for any Production schema/ledger mutation.
- **Required separately before code-only Production merge:** finish Admin form write/read behavior and non-admin write-denial/isolation acceptance with approved controlled fixtures or a documented risk decision; review the typed bridge versus actual schema, consider global lint baseline, remove any preview-only debug UI (already done), and get explicit Founder merge/deploy approval.
- Do not use an unrelated `supabase/config.toml` ID as permission to run `db push`, `migration repair`, or change the actual Production.
