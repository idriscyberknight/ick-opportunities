# A1.8 Alerts — Security Staging migration execution record

**Date:** 2026-10-26. **Environment:** Lovable project `887e7515-30c6-4fa3-bafc-fb8d8d610315`, **ICK Opportunities - Security Staging**. **Production project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35` was NOT targeted** for a write.

## Permission and exact source

The Founder explicitly approved the *Security Staging SQL migration only* after a screenshot of the Backups UI, following the assistant's bounded request. The approval does **not** authorize Production SQL, test-user creation, deployment, sending notifications, PR merge, or live release.

**Source file executed:** `design/a18/alert_staging_schema_REVIEW_ONLY.sql` as it existed on branch `docs/a18-phase4-staging-readiness-20261026`, GitHub blob SHA **`0fbb24ee4e977b2e104d6677e5b71bcba8209cb6`**. The file's header records its former *unapproved design* status; this execution was an explicit **subsequent staging-only Founder authorization**, not implicit permission arising from any PR or merge. The source path remains outside auto-applied migration directories.

## Pre-execution evidence (VERIFIED)

- Independently resolved Lovable project name, staging-only project ID, Cloud PostgreSQL enabled; staging's `.env` URL hostname matched the staging Lovable project ID (no API key or secret recorded).
- Read-only staging metadata preflight: PostgreSQL 17.11; public base tables **18**; both new alerts tables absent; `public.university_review_events` absent; `supabase_migrations.schema_migrations` absent; `auth.users`, `auth.uid()`, `opportunities`, `saved_opportunities`, `anon`, `authenticated` present; expected category enum values and opportunity columns present. Both new alert trigger functions were absent.
- Existing isolated GitHub Actions PostgreSQL 17 run #40307786549: SQL candidate parse, transaction and modeled policy/grant tests **PASS**. That is NOT real JWT evidence.
- Founder-supplied Lovable Backups screenshot shows entries dated October 26, 25, 24, etc. The captured image did **not display the parent project name**, so the exact project attribution and successful restore have **not been independently proven**. No Restore action was performed.

## Execution (CONFIRMED TOOL RETURN, IN-TRANSACTION CHECKS)

A single Lovable `query_database` call was directed **only to the staging project ID**, with the **exact source SQL** above. The source contains `BEGIN`, fail-closed checks against the observed Production-only table and migration ledger, `CREATE TABLE`, RLS/limited grants/policies, and a final `DO` asserting policy/grant invariants, then `COMMIT`.

**Connector returned successfully with `rows: []` and no SQL error.** Because the file is transactional, the successful return supports its staging commit and the in-transaction assertions passing. No existing table was dropped or modified by this SQL; two new alerts tables, policies and triggers were its intended effects.

## Post-execution evidence (NOT YET INDEPENDENTLY VERIFIED)

The immediate **read-only** after-commit catalog query was **not executed**: Lovable Cloud free-plan MCP database-action quota responded to retry after **4 minutes**. Therefore do **not** state that a fresh independent readback, role A/B real REST test, default row count, live UI persistence, delivery, or a tested restore has passed.

When quota permits, perform a separate read-only catalog/privilege query to confirm:
- `alert_preferences` and `user_notifications` exist, with RLS enabled, required policies/indexes/triggers and zero initial rows.
- `enabled DEFAULT false`, no anon SELECT, no authenticated notification INSERT/DELETE or SELECT of `user_id` and `event_key`; only authorized column UPDATEs.
- Production remains unmodified. Do not create sample data until a separate controlled test approval.

**Migration ledger note:** No migration ledger record was inserted or forged; Staging's ledger relation was absent at preflight. The direct SQL execution needs this durable manual audit record and a later approved adoption strategy, not a fabricated history entry.

## State

- **Staging SQL execution:** Success reported by connector and transaction completed.
- **Independent post-commit SELECT verification:** Blocked by quota, pending.
- **Production SQL and deployment:** NOT performed.
- **Alerts:** still OFF; no live delivery.
- **PR #40:** remains Draft, unmerged.


## Independent post-commit readback — VERIFIED later on 2026-10-26

A subsequent **SELECT-only** Lovable Cloud query against the **exact Security Staging project ID** succeeded after the quota block. Observed:

| Evidence | Result |
| --- | --- |
| `public.alert_preferences` | EXISTS; RLS enabled |
| `public.user_notifications` | EXISTS; RLS enabled |
| Alert RLS policies | **6** |
| Indexes across both alert tables (includes primary/unique) | **5** |
| User triggers (excludes system FK triggers) | **2** |
| `alert_preferences.enabled` default | **false** |
| Existing preference rows | **0** |
| Existing notification rows | **0** |
| Anonymous SELECT on either alert table | **DENIED** |
| Authenticated client INSERT or DELETE on notifications | **DENIED** |
| Authenticated client SELECT of notification `event_key` | **DENIED** |
| Authenticated client SELECT/UPDATE of notification `read_at` | **ALLOWED** |

This independently confirms that the intended **staging-only** SQL created the tables and applied the tested grants/RLS scaffolding without seeding rows. It **does not** establish that actual signed-user PostgREST access passes end-to-end tests or that a delivery worker is running.

## Staging UI code candidate — NOT deployed

Within the same unmerged PR #40, a **staging-backend-host-gated** typed adapter and an unlinked `/_authenticated/alerts-staging` route were added in `src/lib/alert-staging-client.ts` and `src/routes/_authenticated/alerts-staging.tsx`. The adapter retrieves signed-in user identity, reads/writes owner preferences on explicit Save, reads narrowly selected notification columns, fetches currently public opportunity titles, and supports read/dismiss actions. It does **not** create or send any notification and refuses DB requests unless the Vite-configured Supabase URL matches the exact Security Staging host.

**Important:** this code currently lives only in the GitHub **Draft PR branch**, not in the separate older Lovable Security Staging project code. A successful preview build is **not a real Staging browser test**. Do not claim the UI is live or connected in the Lovable staging editor until project code is safely synchronized and tested.
