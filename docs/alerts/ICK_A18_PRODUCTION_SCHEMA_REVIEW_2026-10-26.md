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
