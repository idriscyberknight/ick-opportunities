# ICK Opportunities A1.8 — Production Alert Schema Review & Execution Gate
**Status: DRAFT / REVIEW ONLY. The Founder has approved preparing a proposal, NOT running Production SQL.**  
**Official Production Lovable project:** `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`  
**Separate Security Staging:** `887e7515-30c6-4fa3-bafc-fb8d8d610315` (NOT the target).  
**Application code:** Production PR #42 merged as code-only; the new `/alerts` route remains unlinked and the build-time `VITE_A18_PRODUCTION_ALERTS_ENABLED` flag was **absent** on read-back. No automatic alert generation or delivery.

## 1. Verified Production read-only evidence, 2026-10-26
- Lovable Cloud Postgres **17.6**, current role `postgres`, **19 public tables**.
- `public.university_review_events` and `supabase_migrations.schema_migrations` **exist** in Production, **not** the previous Staging snapshot.
- `public.alert_preferences` and `public.user_notifications` **do not exist** (no migration applied).
- `public.opportunities`, `public.saved_opportunities`, `public.profiles` exist; `opportunities` and `saved_opportunities` have RLS enabled.
- Production enum values: opportunity_category = `scholarship,job,internship,grant`; opportunity_status = `active,draft,expired,rejected`; verified_status = `verified,pending_review`.
- Production opportunity columns include: `id uuid`, `status`, `verified_status`, `reviewed_by uuid`, `reviewed_at timestamptz`, `published_at timestamptz`, `deadline date`.
- `opportunities` allows public SELECT only when active, verified, reviewed, published and not expired. Its admins' policy also permits reading drafts, so the proposed notification RLS **independently repeats** publication checks.
- Default-privilege metadata shows potential broad table grants on new objects; the proposal explicitly REVOKEs both table and function privileges before granting the narrow required column operations.
- Catalog query identified **no existing `a18_*` functions or `alert_*` tables**.

**All of the above are source-specific metadata observations, not assurances of a backup, authentic user A/B RLS test, or Production migration success.**

## 2. Proposed exact change
File: `design/a18/alert_production_schema_REVIEW_ONLY.sql` (not in `supabase/migrations`).
It contains a BEGIN/COMMIT transaction, fail-closed preflight matching **Production** markers/enums/schema, create-only tables, ownership RLS policies, column-level least privileges, one-purpose triggers, indexes, and post-definition security invariants. New-table defaults are `enabled = false` and no notifications are inserted by the script. The user-facing client is still runtime gated OFF.

Security model:
- `alert_preferences`: one `user_id` row per verified signed-in user; SELECT/INSERT/UPDATE/DELETE owner-scoped; no user-editable `updated_at`.
- `user_notifications`: created only by a future separately-reviewed trusted writer, with `UNIQUE(user_id,event_key)` for dedupe; client SELECT of *six approved columns* and UPDATE only `read_at`/`dismissed_at`. No client INSERT/DELETE; `event_key` and ownership remain restricted.
- Notification visibility requires owner identity, explicit preference `enabled=true`, and a **currently** active/verified/reviewed/published/unexpired referenced opportunity. Re-check on each fetch/update.
- Trigger stamps write timestamps server-side and disallows reversing action timestamps.

**Limits:** A future trusted delivery writer still needs explicit architecture and permissions review. SQL migration alone does not produce, schedule or deliver an alert. Per-user timezone is stored with structural (not verified IANA) checks. Default is `Etc/UTC`; future time-sensitive worker must validate time zones.

## 3. Safe verification without Production writes
New CI in `.github/workflows/a18-production-schema-design-ci.yml` uses a **disposable Docker PostgreSQL 17 service** with fake `auth.uid()` claims. It parses/runs the draft SQL there, checks owner-level RLS, opt-out, published-only notifications, restricted columns, immutable timestamps and duplicate event blocking, and tries executing against a second **wrong-target synthetic DB** without the Production marker. Wrong-target must fail without creating alert tables.

Passing CI proves **only synthetic PostgreSQL SQL semantics**. It does NOT test real cryptographically signed PostgREST JWTs or Lovable Production integration.

## 4. Checks REQUIRED before any Production SQL (STOP if any fail)
1. Confirm exact Production project in Lovable UI/connector and that no target alias has changed. Snapshot markers alone **do not uniquely identify** a project.
2. Independently review the exact PR SQL with backend/DB security expertise; resolve any drift since the 2026-10-26 snapshot (do not bypass STOP checks).
3. Obtain and **verify** an actual restorable Production backup (including Auth and relevant existing data), recovery permissions and a test restore/report. Backup existence **not verified**.
4. Determine how Lovable Cloud tracks migration history and whether manual SQL bypasses the existing `supabase_migrations.schema_migrations` ledger; decide on approved tracking and record it. **Do not fabricate/write ledger entries.**
5. Owner explicitly approves **the exact SQL content SHA or commit SHA, Production project ID, the write operation, recovery method and window**. General “Yes” to preparing the proposal is NOT such approval.

## 5. Only after separately authorized Production DDL
- Perform read-only post-commit verification: tables exist; RLS enabled; exactly 6 intended policies; no anon SELECT; authenticated cannot INSERT/DELETE notification table or read `event_key`; authorized preferences INSERT/UPDATE columns only; defaults OFF; no newly sent notifications.
- Independently verify authenticated User A and User B via **real signed sessions**, and unauthenticated requests; do not log JWTs or fake successful test cases. Account provisioning, test data writes and cross-account probes require an approved controlled method. Evidence is currently **missing**.
- Keep `VITE_A18_PRODUCTION_ALERTS_ENABLED` absent/false until specific Founder approval following successful real auth, recoverability and deployment tests. Initial pilot OFF for each account; do not link UI in navigation.
- Production Vercel readiness, deployment, mobile-device test and monitoring are separate release gates.

## 6. Incident handling and rollback planning
- Transaction failure **before COMMIT** rolls back schema changes automatically.
- If a **committed** migration must be rolled back, first disable/keep OFF any UI flag and pause any future writer. Verify tables contain **zero rows**, obtain authorized evidence of recoverability, then separately review a *destructive* inverse script (drop new policies, triggers, functions, indexes and new tables only). This inverse script is **intentionally not executable here**; no automated Production DROP permitted. If rows exist, stopping service and preserving/exporting data comes before any rollback plan.
- Never change, drop or restore existing `opportunities`, `profiles`, `saved_opportunities`, `university_review_events`, auth tables or migration ledger as part of this feature.

## Founder decision status
**Authorized now:** read-only Production inspection, creation of this Draft PR, disposable tests.  
**NOT authorized now:** Production schema writes, user/account/test data writes, GitHub PR merge, feature-flag enablement, deployment, automated alert delivery, changing backups or migration ledger.

The review-only SQL is **not ready to execute** until these checks and specific Founder approval are recorded.

## 7. Recovery and migration history investigation — read-only follow-up, 2026-10-26
### Lovable Cloud backup capability: documented, NOT verified for this project
Official Lovable docs: https://docs.lovable.dev/features/database-backups
- Managed Cloud takes one **database** snapshot each day, typically retaining up to roughly **14 daily copies**. It includes schema and data but **not Storage files**.
- Account holder can inspect backup timestamps from the *existing Production project* in **More → Database → Manage → Backups**.
- **DO NOT click Restore** during readiness checks. Restoring loses all data created/changed after that snapshot; it may also revert schema and cause code mismatches.
- Lovable can export a compressed PostgreSQL archive from **More → Database → Manage → Settings → Export project data**. Exports include user accounts and password hashes; treat as highly sensitive, store privately, do not upload to GitHub or this conversation. Export availability and safe independent test-restore are **not yet verified**.
- The connected Lovable tools available for this audit do **NOT expose a Backups list, snapshot timestamp, archive download, or a safe isolated restore function**. We have **not** inspected or restored a snapshot. The presence of a documented feature is not proof this particular Production DB has a restorable, tested copy.
- Do not require the Founder to provide credentials, password hashes, personal records or any archive. Only the snapshot *date and UTC time* (or a screenshot with other data hidden) is necessary to establish that a visible backup exists.

### Production migration-ledger reconciliation: identified discrepancy, NOT resolved
Verified SELECT-only query against **Production** `supabase_migrations.schema_migrations` found **13 records**, latest `version = 20261005021810`, with columns `version, statements, name, created_by, idempotency_key, rollback`.
By contrast, the official Production repository `main` currently has **14 SQL files** under `supabase/migrations/`, including:
`20261008100000_c5_tighten_database_privileges.sql`, which is **NOT represented in the database ledger**.

This does **not** establish whether C5 was executed manually, partially applied, applied through a separate mechanism, or never applied. Independent SELECT-only privilege checks **match important C5 intended effects** (e.g., `anon` cannot SELECT profiles/user_roles; `authenticated` cannot INSERT/UPDATE/DELETE user_roles or TRUNCATE opportunities; `postgres` default ACL in public no longer grants clients). However, `supabase_admin`'s public default ACL **still grants clients**, so C5's changes to `postgres` default ACL alone do not prove all future objects are born private. A1.8's proposed new-table SQL explicitly REVOKEs broad privileges on both tables and new functions.

**STOP before any Production schema execution** until the migration author/runner and ledger expectations are reconciled. Do not fabricate an entry for C5 or run C5 merely to make counts match. The current repository is a legacy `supabase/migrations/` project; official modern Lovable documentation now describes `drizzle/migrations/` for new projects. Follow the actual project's confirmed migration engine rather than assuming a newer documented default applies here.

### Verified minimal live-Production data footprint (counts only)
Read-only counts: **14 opportunities, 10 profiles, 0 saved opportunities**. These are dynamic and were not exported. Neither backup nor storage state was queried.

**Current outcome:** Production DB unchanged; the review-only A1.8 SQL is **not cleared for execution** because verified backup/restore evidence, C5 ledger reconciliation, and real authenticated A/B tests are missing.


## 8. Founder screenshot: visible Lovable Backups (2026-10-26)
A Founder-provided screenshot of Lovable **Backups**, in response to the Production-backup verification request, visibly lists **at least five snapshots** with these **UTC** times:
- **2026-10-26 04:17:07 UTC** (newest visible)
- 2026-10-25 04:18:34 UTC
- 2026-10-24 04:18:25 UTC
- 2026-10-23 23:41:57 UTC
- 2026-10-23 21:32:39 UTC

Each row shows a `Restore to this backup` action. **No Restore was clicked by this assistant or requested from the Founder.**

**Evidence scope:** The screenshot establishes backup entries were displayed in the Lovable UI. It does **not** itself display a project ID; association with the Production project is supported by the prior user navigation instructions/context but has not been independently verified from a visible project identifier. The screenshot does **not** prove a successful restore, the archive contents' integrity, a backup of non-database Storage objects, or zero data loss. The latest visible snapshot preceded subsequent changes on 2026-10-26; recovery to it could lose all intervening writes.

**Updated gate:** Presence of UI snapshot entries: **OBSERVED**. Exact target identity for these entries: **CONTEXTUAL, not independently proven**. Actual safe restore/rehearsal: **NOT VERIFIED**. Production SQL remains **NOT AUTHORIZED**. Do not press any `Restore` control or upload sensitive database archives to GitHub/ChatGPT.


## 9. C5 migration-status investigation: privilege parity confirmed, historical execution route unresolved (2026-10-27)
New evidence from **read-only** Production SQL catalog checks compared against exact `supabase/migrations/20261008100000_c5_tighten_database_privileges.sql`:
- **21 of 21** targeted table-level privileges match the C5 post-change expectation, including anonymous read limited to appropriate opportunity access, no user-role writes by authenticated users, restricted audit/discovery DML, and authenticated INSERT/DELETE but no UPDATE on saved opportunities.
- **5 of 5** targeted column-level checks match C5: `discovery_settings.cron_token` unreadable/uneditable to authenticated; its allowlisted `scheduled_enabled` and `updated_at` grants intact.
- Default privilege checks confirm **`postgres` public schema new-table, sequence, and function defaults do not grant client privileges**; `supabase_admin` defaults DO still grant to clients, which was identified and left untouched in the original C5 design.
- **GitHub PR #1 `C5: Tighten database privileges` was merged on 2026-10-20 at 00:02:03 UTC** (commit `b65b9686322a7dffe035e85542f327ec409aded7`). This merged the SQL file to GitHub code, **not independent proof it was run against the database**.
- The Production migration ledger still has **13 records** and latest recorded version `20261005021810`, while the repository contains **14** migration files (the newer C5 file has timestamp/version `20261008100000`).

### Reconciled conclusions
1. **C5 intended *effective* privilege state: STRONGLY SUPPORTED by all 26 targeted, independently queried permissions and default ACL evidence.** This mitigates suspicion that the broad pre-C5 permissions remain active.
2. **C5 historical application method and migration tracking: NOT PROVEN.** Possibilities include an SQL application that bypassed the tracked ledger, other manual grant changes with the same effect, or an alternative migration runner. Neither a successful GitHub merge nor an equivalent ACL state proves how changes occurred.
3. **Never rerun C5 or insert a ledger record just to reconcile the count.** A failed/idempotent-safe status cannot be inferred from historical metadata.
4. For A1.8, keep new migration as `design/` **REVIEW_ONLY** until the actual Lovable migration-runner procedure is documented, the Production snapshot/backups are confirmed as restorable by an authorized, non-destructive rehearsal if feasible, and exact SQL receives a separate explicit approval. **No new Production SQL writes have been made.**
5. Do not assume historical C5 uncertainty means current ACLs are unsafe: distinguish **privilege evidence** from **migration bookkeeping**. No need to restart earlier staging work.

This reduces the C5 security uncertainty materially but does NOT constitute authorization for Production A1.8 schema changes or production pilot activation.


## 10. Recovery gate refined from official Lovable documentation (reviewed 2026-10-27)
Authoritative reference: https://docs.lovable.dev/features/database-backups

**Critical operational finding:** Lovable's "Restore to this backup" action **always replaces that same project's database**, causing all changes since the snapshot to be lost and potentially creating a schema/code mismatch. The connected tools provide **no non-destructive restore drill or backup-snapshot inspection API**. Do **not** attempt a Production restore just to test backup usability.

A safer recovery-evidence path for this small, prelaunch project:
1. **Observed:** the Founder-provided Lovable Backups screenshot lists daily snapshot entries, latest visible 2026-10-26 04:17:07 UTC. This snapshot will age; reconfirm a current snapshot date/target when scheduling any Production write.
2. **Independent copy — not yet performed:** from the *confirmed Production project* go to `More → Database → Manage → Settings → Export project data → Export data → Start export`. Official docs say the export arrives through Storage and email; download and preserve it **outside Lovable Storage**, in a secure, private location. **Never upload it to a public repository, this chat, or CI** because the archive contains user records and password hashes. Storage files/Edge Function secrets require separate treatment.
3. **Export verification — not yet performed:** confirm the archive exists, is non-empty, can be read as a PostgreSQL archive with `pg_restore --list` by an authorized administrator **offline**, and contains the expected production schema/table descriptions. This is not proof of a successful restore, but it is stronger than an untested UI snapshot. A full independent isolated restore needs a secure, separate destination and explicit approval; do not spin up paid infrastructure or move user data casually.
4. **Recovery plan:** preserve the export, keep UI alert flag OFF, and document that a committed Production migration cannot be undone automatically. If anything goes wrong, perform an incident review and choose a targeted schema fix or separately approved recovery; don't blindly click an old snapshot and erase newer data.
5. **Migration-ledger execution path:** confirmed Production has `supabase_migrations.schema_migrations` with 13 older rows; C5 Github PR #1 was merged and 26/26 live permissions now match, but C5's corresponding ledger entry is absent. Review the actual Lovable migration mechanism before choosing between an approved migration runner vs manual SQL. Neither creating a SQL file in GitHub nor calling a raw query automatically proves a ledger entry was created. **Do not manufacture a C5 or A1.8 record**.

**Release gate adjustment:** a destructive Production restore is **NOT** a reasonable prerequisite or a safe proof of backup correctness. Instead, require (a) a recent on-screen Lovable backup plus (b) a separately stored, integrity-checked export where available, with any true restore rehearsal only on a secure isolated system, and (c) an approved execution + rollback/recovery plan. The actual Production DDL still requires exact Founder approval and validation of its target, migration bookkeeping, and security.


## 11. Founder-confirmed private Production export and current read-only preflight (2026-10-27)
**Founder statement:** The export from the requested Lovable Production backup/export workflow has **been completed and the file saved**. This is **user-confirmed backup-export possession**, not independent verification of the archive format, completeness, storage location, test restore, or integrity. No archive contents, password hashes or credentials were requested or uploaded.

**Additional independent read-only Production catalog preflight on 2026-10-27:**
- Exact connector project targeted: `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`; PostgreSQL `17.6`.
- Both `public.alert_preferences` and `public.user_notifications` **still absent**.
- All required preexisting objects observed, including `public.opportunities`, `public.saved_opportunities`, `public.profiles`, `public.university_review_events`, `supabase_migrations.schema_migrations`, `auth.users`.
- RLS on both existing `opportunities` and `saved_opportunities`: **enabled**.
- All three expected enum arrays match the exact Production migration preflight.
- Authenticated SELECT privilege on `public.opportunities`: **present**.
- 13 ledger rows, latest `20261005021810`; C5 `20261008100000` **still absent from ledger** (despite current C5-style privilege parity).
- 14 opportunities, 10 profiles during snapshot. These are time-specific counts, not a backup export audit.
- Proposed exact SQL file Git blob SHA at this checkpoint: `3bf2198bb8c8583100f310354d8b0b4c418259ce`, path `design/a18/alert_production_schema_REVIEW_ONLY.sql`. Tests used a disposable PostgreSQL 17 mock; **no SQL was run against Production**.

**Execution decision remains separate**. The additive, fail-closed transaction is designed to create exactly two new alert tables and associated narrowly-scoped policies, grants, functions, indexes and triggers; the code-side feature flag remains OFF and no delivery worker exists. This is not a proof of actual production PostgREST signed-user isolation. Before running, an authorized operator must independently ensure the private export is a usable archive or explicitly accept residual recovery risk, choose and document how this change will be tracked given the existing missing C5 ledger entry, inspect current deployment environment and fresh backup, and obtain **an explicit separate approval referring to the exact Production target and SQL candidate**. Never treat the user's message "Yes, I exported and saved it" as DDL approval.
