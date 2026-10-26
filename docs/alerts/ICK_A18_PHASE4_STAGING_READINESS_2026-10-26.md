# ICK Opportunities — A1.8 Phase 4: Staging Readiness and Migration Design Gate

**Evidence date:** 2026-10-26  
**Status:** DESIGN + READ-ONLY DATABASE REVIEW ONLY. **NOT** authorization to migrate, release, or deliver alerts.  
**Affected workflow:** issue #35; previous passive phases merged via PRs #37, #38, #39.  
**Source of evidence:** connected GitHub main at PR #39 and read-only queries of the two actual Lovable Cloud databases. No credentials, personal account IDs, JWTs, or user data were queried for this report.

> STOP: Never execute `design/a18/alert_schema_prototype.sql` against any Lovable Cloud environment just because this document or its PR is merged. No DDL, migrations, account creation, automated alerts, scheduling, production release, or deployment approval is contained here. A distinct Founder-approved, target-locked **staging-only** migration is required.

## 1. Observed environment separation

- Lovable Production and the separate **ICK Opportunities - Security Staging** project use different `SUPABASE_PROJECT_ID` values and different `SUPABASE_URL` hosts in their own `.env` configurations. The `VITE_` values within each project's configuration agree with their own non-`VITE_` values. Secret key values were not emitted.
- Their database endpoints were queried independently. **Production:** PostgreSQL **17.6**, **19** public base tables (count observed earlier during Phase 4). **Staging:** PostgreSQL **17.11**, **18** public base tables and an independently read full 18-table inventory.
- Both have `auth.users`, `auth.uid()`, `public.opportunities`, `public.profiles`, `public.saved_opportunities` and `public.opportunity_category` with values `scholarship`, `job`, `internship`, `grant`.
- In both databases, `public.alert_preferences` and `public.user_notifications` **do not exist**.
- The read-only queries verified `opportunities` public SELECT policy constraints requiring active, verified, reviewed and published rows with an unexpired/null deadline. The separate admin SELECT policy also exists in both.
- Both environments currently have **broad PostgreSQL default table ACL entries** for `anon` and `authenticated` under the `postgres` creator. This is a future-object exposure hazard if DDL omits explicit revocation; it does **not**, by itself, establish access to rows of existing RLS-protected tables.
- The separate Security Staging project's code snapshot does **not** contain Phase 3's `AlertPreferencesPanel.tsx`, `alerts-preview.tsx`, or `design/a18/alert_schema_prototype.sql`; the latest main code and that staging app must not be treated as equivalent.

### Important limits / unresolved differences

1. The **identity of the extra Production public table** is not yet verified: Production returned count 19 and Staging listed 18. Do not assume identical schemas solely from common table names.
2. A complete per-column, constraint, grant, function, index and migration-ledger diff was **not** completed. Production follow-up read was rate-limited by Lovable's free-plan MCP database action quota.
3. `VITE_` config matching within each project and different URLs strongly support separation, but are **not** proof of every runtime/preview/deployment mapping or backup policy.
4. No actual signed Supabase user-A/user-B/anonymous PostgREST requests were executed for the proposed alerts schema; the earlier PostgreSQL 16 CI used **mocked session claims**.
5. Neither database has the two new tables yet, so no live privilege, RLS, or performance findings about those tables can be asserted.

## 2. Proposed schema review — unresolved issues BEFORE staging DDL

Review `design/a18/alert_schema_prototype.sql` against the authoritative staging catalog and Supabase's current guidance.

| Topic | Current draft | Gate before staging use |
|---|---|---|
| Consent | `enabled DEFAULT false` | Keep **OFF** for every account until explicit opt-in is saved and confirmed; neither onboarding nor preview implies consent. |
| Owner isolation | `user_id = (SELECT auth.uid())` RLS | Real signed-JWT A/B/anon tests, for SELECT/INSERT/UPDATE/DELETE as applicable, plus account switching and token refresh. |
| Notification writes | Client may SELECT and column-UPDATE `read_at`, `dismissed_at` | Verify all other client DML denied, including privilege inheritance, table-level grants and immutable `user_id`, `event_key`, `opportunity_id`. |
| Broad default grants | Draft explicitly REVOKEs from PUBLIC/anon/authenticated | Re-check effective table **and column** privileges immediately after staging DDL. Address global default-ACL policy as a **separate reviewed change**, not bundled silently here. |
| Metadata exposure | `user_notifications` currently grants table-wide SELECT | Review whether `event_key`, `opportunity_id`, and legacy metadata should be readable by users after opportunity revocation. Prefer least-privilege projection/access paths; React display masking alone is not database confidentiality. |
| User-editable timestamps | `updated_at` and `read_at`/`dismissed_at` fields | Decide allowed timestamp transitions; prevent client-controlled audit timestamp forgery and unsafe status flips where required. |
| Timezones | DB regex only | Validate **real IANA timezone** in trusted backend; regex alone is not timezone validation. Keep `Etc/UTC` safe default pending explicit user selection. |
| Publication | Future trusted worker may bypass ordinary RLS | Re-evaluate opportunity publication/verification/deadline criteria at insertion and display time. Avoid service keys in browser. |
| Duplicate alerts | `UNIQUE(user_id,event_key)` | Concurrent idempotency test, `ON CONFLICT` safe behavior, suppression on opt-out and revocation, event retention policy. |
| FK behavior | Notifications FK `opportunities(id) ON DELETE CASCADE` | Confirm desired history and revocation model; unpublish is not deletion and must not make stale titles visible. |

### Frontend ↔ SQL adapter contract (not yet implemented)

| Frontend field | Proposed DB column |
|---|---|
| `enabled` | `enabled` |
| `newMatchesEnabled` | `new_matches_enabled` |
| `savedDeadlineRemindersEnabled` | `saved_deadlines_enabled` |
| `categories` | `categories` (typed enum array) |
| `minimumMatchScore` | `minimum_match_score` |
| `deadlineLeadDays` | `deadline_lead_days` |
| No preview UI field | `timezone` — independently validate and set intentionally |

The future adapter must handle secure explicit Save, server confirmation/read-back, validation failures, account-switch cache invalidation, clear opt-out, and retry semantics; do not treat React `onChange` as persistence.

## 3. Staging-only execution plan — NOT APPROVED / NOT RUN

1. **Target preflight:** obtain exact authoritative staging API hostname/project ID, inspect actual database identity and migration runner; explicitly reject any match with Production. Identify the unaccounted-for Production table and evaluate relevant schema drift.
2. **Backup/restore:** establish documented staging backup or disposable replacement and *demonstrated* restore path; never assume a Git branch/Vercel preview clones data.
3. **Migration review:** revise the prototype into a separately reviewed, **staging-only**, precondition-checked transactional migration through the verified Lovable deployment/migration mechanism. Confirm expected enum/table/FK/unique/index/column structure, effective default grants and version compatibility. No copy into `supabase/migrations` until runner behavior is proven.
4. **Security assertions:** after a distinct Founder approval to run staging DDL, inspect RLS enabled status, `pg_policies`, `has_table_privilege`, `has_column_privilege`, `pg_default_acl`, index/FK ownership and no exposure to `anon`.
5. **True end-to-end role matrix:** use **two real, distinct signed staging users** and unauthenticated client. Verify A cannot read/change B's preferences or notifications; anon denied; own updates allowed only on explicitly permitted columns; `event_key` protected as designed; no client inserts forged notification; no owner reassignment; invalid settings refused.
6. **Lifecycle matrix:** default OFF, explicit opt-in and opt-out, user session change, unpublished/expired/deleted opportunities, timezone boundary, race-condition deduplication, stale or malformed data, and private metadata rendering. Revoke must hide sensitive opportunity details even if historic notification row remains.
7. **Rollback and release gate:** test rollback in staging, inspect pre-/post-inventory, record objective evidence, and require a **new Founder approval** before any Production SQL, live notification generation, scheduling, in-app navigation or delivery channels.

## 4. Explicit non-actions

- **No SQL writes or DDL** performed in Production or Staging during this audit.
- **No production migration file** created, no migration ledger edited, no data backfill.
- No active notification rows, consent records, email, SMS, push, cron, or backend trigger enabled.
- No CI success from old mocked-JWT tests is represented as real Supabase signed-token proof.
- This documentation may be reviewed as a Draft PR; **do not merge it automatically**, and do not interpret its merge as database approval.

## 5. Official references

- Supabase: [Securing your API (grants + RLS)](https://supabase.com/docs/guides/api/securing-your-api).
- Supabase: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Related repository artifacts: `design/a18/README.md`, `design/a18/alert_schema_prototype.sql`, `tests/a18/db_isolated_security.sql`, `docs/alerts/ICK_A18_PHASE3_UI_PREVIEW_2026-10-26.md`.

**Current decision:** **HOLD** staging DDL until (a) table drift and migration target resolved, (b) revised least-privilege design reviewed, (c) backup/restore path verified, and (d) explicit Founder authorization for staging execution is recorded.
