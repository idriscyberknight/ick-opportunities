# ICK Opportunities — A1.8 Phase 4.3: Staging-only migration preflight

**Date:** 2026-10-26  
**Status:** **PREPARATION ONLY** — not an executable migration, not staging-DDL approval, not a production release.  
**Related:** Draft PR #40, issue #35, `design/a18/alert_schema_prototype.sql`, `docs/alerts/ICK_A18_PHASE4_STAGING_READINESS_2026-10-26.md`.

## Decision gate — NO-GO for DDL today

The main GitHub repository and Lovable **Security Staging** repository are not at equivalent code revisions; the latter lacks Phase 3 notification components and the A1.8 schema prototype. Never mistake a GitHub PR/Vercel preview for a cloned database.

**Independently observed Lovable Cloud environment baselines:**

| Check | Production | Security Staging |
| --- | --- | --- |
| Backend URL / project ID | Separate from Staging | Separate from Production |
| PostgreSQL | 17.6 | 17.11 |
| Public base-table count | 19 (prior read) | 18 (2026-10-26 full list) |
| `auth.users`, `auth.uid()` | Exists | Exists |
| `public.opportunity_category` | 4 expected values | 4 expected values |
| `public.opportunities` | Exists, public visibility RLS | Exists, same observed public visibility expression |
| `public.alert_preferences` | Absent | Absent |
| `public.user_notifications` | Absent | Absent |
| Broad creator default grants | Observed | Observed |

The specific Production-only table is still **unknown**: a new read-only Production inventory request was rejected due to Lovable free-plan action limits and was **not executed**. Neither role-by-role real JWT authorization testing nor backup-restoration testing has occurred.

## A. Independent, READ-ONLY environment preflight

Run **each** following `SELECT` manually/through read-only connector on the *separately identified* Production and Security Staging targets. Collect **only schema metadata** (never credentials, auth row data, user IDs, JWT values or notification payloads). Stop when either target cannot be proven.

### A1. Minimal names and dependencies (SELECT only)

```sql
SELECT current_setting('server_version') AS postgres_version,
       (SELECT COALESCE(json_agg(table_name ORDER BY table_name), '[]'::json)
          FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS public_tables,
       to_regclass('auth.users') IS NOT NULL AS auth_users_exists,
       to_regprocedure('auth.uid()') IS NOT NULL AS auth_uid_exists,
       to_regclass('public.opportunities') IS NOT NULL AS opportunities_exists,
       to_regclass('public.alert_preferences') IS NOT NULL AS prefs_exists,
       to_regclass('public.user_notifications') IS NOT NULL AS notifications_exists;
```

Expected: Production and Staging have different connections; neither has alerts tables. Compare the returned `public_tables` arrays to name **each difference**, not just compare counts. If the sets drift in a way that affects alerts, STOP.

### A2. Relevant column contract (SELECT only)

```sql
SELECT table_name, column_name, udt_name, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('opportunities', 'profiles', 'saved_opportunities')
   AND column_name IN ('id','user_id','opportunity_id','category',
                       'status','verified_status','reviewed_at',
                       'reviewed_by','published_at','deadline')
 ORDER BY table_name, ordinal_position;
```

Compare with the prototype FK, enum and published-only visibility assumptions. **No rows of real opportunities or profiles need to be read.**

### A3. Relevant policies/privilege assertions (SELECT only)

```sql
SELECT tablename, policyname, cmd, roles, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('opportunities', 'saved_opportunities', 'profiles')
 ORDER BY tablename, policyname;
```

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public'
   AND c.relname IN ('opportunities','profiles','saved_opportunities');
```

Record effective `anon`/`authenticated` privileges and creator default ACLs in an additional reviewed metadata query when read quota permits. Do not conflate `GRANT` with RLS row ownership.

### A4. Runner and restore gate (DOCUMENTATION CHECK — no SQL mutation)

- Identify which *actual Lovable Cloud* project receives deployments and which migration runner (if any) applies SQL. A separate personal Supabase workspace/project is **not** interchangeable.
- Inspect **read-only** migration ledger metadata and compare against repository-managed migrations, avoiding fabricated adoption entries for earlier direct university-registry DDL.
- Verify there is a *working staging restore/reprovision plan* suitable for DDL testing. **Not yet demonstrated.**
- Do not copy a design SQL document into auto-applied `supabase/migrations`; do not change existing university tables or production tables.

## B. Design issues to resolve in a separately reviewed *future* staging migration

1. **Default consent OFF:** `enabled=false` must hold for absent preferences and newly created rows. Visiting the UI or editing draft controls does not grant consent. Explicit validated Save/read-back and opt-out behavior are required.
2. **Field naming:** `savedDeadlineRemindersEnabled` (frontend) maps to `saved_deadlines_enabled` (prototype); similarly map all camelCase to snake_case. No live adapter exists.
3. **Timezones:** `timezone` is not in the current UI model; validate against an accepted IANA timezone list on a trusted path. The prototype regex verifies only format and cannot establish a real timezone.
4. **Notification confidentiality:** the prototype grants table-wide SELECT of `event_key`, `opportunity_id` and other columns even when a referenced opportunity later becomes private. UI masking is *not* a guarantee against direct REST access. Choose an explicitly approved least-privilege response/column contract and test revoked/expired/unpublished cases.
5. **Immutable fields and timestamps:** assess client-controlled `updated_at`, `read_at`, `dismissed_at`; ensure `user_id`, `event_key`, `opportunity_id`, `kind` and creation metadata cannot be tampered with through API grants, inherited privileges or RPCs. Check update transition rules.
6. **Existing public visibility:** public SELECT policy gates on active+verified+reviewed+published+current deadline; normal authenticated users may have additional restricted visibility only if explicitly authorized. The future notification view must use **public-eligible** opportunity visibility, not infer public publication merely from broad admin visibility or an untrusted payload.
7. **DB grants / RLS:** use explicit minimum grants, correct `TO authenticated`, `USING`/`WITH CHECK`, after-migration `has_table_privilege` and `has_column_privilege` assertions. Staging's broad `pg_default_acl` entries are a documented risk; no global ACL alteration is implicitly authorized.
8. **Delivery controls:** worker or outbox must be server-side with rechecked opt-in and publication, atomic deduplication (`UNIQUE(user_id,event_key)`), bounds/rate limits, retention, monitoring, kill switch and accountable rollback. No client-side service-role secret, no email/SMS/push in this phase.

## C. Staging acceptance matrix (NOT YET RUN)

| Test persona/case | Expected result |
| --- | --- |
| Genuine signed User A | Can read/edit own allowed preference fields only. |
| Genuine signed User B | Cannot read, update, delete A's preference or notification. |
| Unauthenticated REST client | Cannot read or write owner preferences/notification metadata. |
| Cross-user UUID guess | No owner data, no notification alteration. |
| Attempt to forge notification INSERT | Denied to ordinary authenticated client. |
| Attempt to rewrite notification identity/event | Denied. |
| New account | Alerts remain OFF; no implicit consent on first use. |
| Invalid score, category, deadline window, timezone | Rejected; no invalid stored preferences. |
| Withdrawn/expired/unpublished opportunity | No protected title or private metadata disclosed through UI **or** direct API. |
| User logout/account switch/token refresh | Previous account cache and data cannot appear in new session. |
| Concurrent delivery with same event key | At most one stored notification per user/event; cancellation respects opt-out. |
| Rollback rehearsal | Staging returns to documented preflight state with no user data loss. |

Real HTTP tests require real **signed** Supabase Auth sessions in the isolated **staging** backend. The earlier PostgreSQL 16 `SET request.jwt.claim.sub` fixture is **not** that evidence.

## D. Next Founder-controlled boundaries

- **Can proceed without new SQL approval:** read-only catalog and privilege checks, documentation, architecture review, staging-specific adapter design, non-live unit/CI tests.
- **Must request separate explicit approval:** running the *reviewed* schema mutation on the exact staging Lovable Cloud database; creating/editing live staging Auth accounts or seeding data; any production DDL; merging code PRs; enabling notification delivery or scheduling.
- **Automatic stop conditions:** unknown/mismatched connection, unresolved table drift affecting alerts, no verified restore path, failing RLS/grant review, excessive metadata exposure, or a query rate limit.

**Result: migration preparation expanded; NO Staging or Production schema changes, NO releases, NO alerts enabled.**
