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
