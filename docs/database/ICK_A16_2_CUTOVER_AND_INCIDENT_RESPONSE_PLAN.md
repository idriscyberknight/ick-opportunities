# ICK Opportunities A1.6.2 — Controlled Cutover & Incident Containment Plan

**Date:** 2026-10-25 | **Status: Proposed, NOT authorized to execute on Production.**
**Authoritative target:** Lovable Cloud database for ICK Opportunities; do NOT target the separately connected personal Supabase account.
**Safety boundary:** This document contains planning and verification steps only; no user passwords, project secrets or replay-ready Production migration.

## A. Baseline confirmed by read-only Production inspection

- Lovable Cloud database enabled; ICK Opportunities Vercel Production continues at approved A1.6.1 baseline SHA `bd811d8c2000d19aa72f2cd91fba8cf3e4c4560a`.
- Existing registry counts: **1** pending unpublished university draft, **1** alias, **1** pending unreviewed evidence item, **0** classifications, **0** published records.
- Registry RLS: four enabled tables, 12 Admin-only policies, `universities_no_publishing_yet` checked/validated.
- Current 39-column and policy-hash fingerprints match the previously recorded A1.4 baseline.
- `ick_a16_review_evidence` absent; `university_review_events` absent.
- 13 recorded `supabase_migrations.schema_migrations` versions, maximum `20261005021810`; `20261008100000` C5 recorded **zero** times despite prior verified current effective privileges. Four A1.4 registry tables were installed directly and are unrecorded in this migration ledger.
- Existing `public.has_role(uuid,app_role)` on live Production is SQL STABLE **SECURITY DEFINER**, owned by `postgres`, with function `search_path=public`; `anon` has **no EXECUTE** while `authenticated` does. Function source uses `public.user_roles` and equality on user UUID and app role.
- `auth.uid()` is **SECURITY INVOKER**, owned by `supabase_auth_admin`. This is a catalog state check; it does not certify the current session is secure or grant a request authorization.
- All 10 review-state columns have effective `authenticated` UPDATE privileges under preexisting Admin-only RLS. Future Admin editorial decisions could be performed directly without an audit log unless privileges are narrowed.
- Founder reports latest full Lovable Cloud database export is completed and privately saved. **Export contents, timestamp, off-platform retention and actual restore capability are not independently checked.** Original daily backup listed Oct 25 02:16:10 UTC, before the post-12:49 UTC private registry data.

## B. Migration ownership reconciliation — hard gate

1. Obtain Lovable project settings/owner evidence showing the target database identity and the **supported** schema change runner for this actual legacy `supabase/migrations/` project.
2. Compare **all 13** live ledger versions against corresponding 13 historical migration files, and independently verify the existing C5 *effective end-state* (not just the missing ledger version). Never assume a GitHub merge runs DDL.
3. Obtain provider-supported procedures for adopting a prior direct-SQL-installed A1.4 schema. Do not run the historic CREATE TABLE draft or manually insert fake `supabase_migrations.schema_migrations` records. If a safe adoption process is unavailable, keep the gap recorded and **stop automated migrations**.
4. Identify which database role will **own** the new `SECURITY DEFINER` RPC and whether a restricted dedicated function-owner role is supported. Function owner has elevated privileges; explicit actor/role checks, input checks, no dynamic SQL and `SET search_path=''` do not make a privileged function intrinsically risk-free.
5. Review `PUBLIC` EXECUTE, `anon` EXECUTE, `authenticated` EXECUTE, schema usage, table ACL, current RLS and default ACL **before and after** creation. Assert the function's exact signature; no overloaded public variants. Check privilege inheritance and role grants, not only source code.
6. Generate a reviewed, versioned migration from the **supported actual runner**, or an explicitly approved tightly scoped SQL-editor change procedure if the runner cannot safely adopt history. Store the human-approved SQL checksum and verified rollback/containment expectations. PR #27 `tests/a16/` SQL is an isolated prototype, NOT that Production change set.

**No migration history reconciliation is considered complete until all six items above are evidenced.**

## C. Safe staged cutover order — do not reverse

0. Controlled isolated database restore test of the private export, with no account secrets exposed. Confirm a feasible recovery timeframe and confidentiality of export/storage.
1. Review and merge **compatible client PR #28 FIRST**, with A1.6.2 editorial submission gate hard-coded false. Admin draft UPDATE must send only safe draft fields and still work against the OLD Production database. Verify real signed Admin draft editing while pending; Normal User access remains denied.
2. Review exact A1.6.2 SQL migration adapted to the real Production schema; test on a *sanitized, nonempty* existing-data fixture and run full DDL `BEGIN/ROLLBACK` scenario. This isolated test passed in PR #27 CI; confirm the current commit and rerun after any SQL change.
3. On an approved Production change window with private checkpoint and Founder signoff, deploy A1.6.2 backend changes as **one atomic SQL transaction** only after verifying preflight fingerprints and zero unexpected migrations. The publication CHECK remains in force. Never reopen public university READ.
4. Independently inspect exact privileges, function owner/security configuration, audit table RLS, existing data counts, and behavior of the **already shipped compatible frontend**, with real JWT role tests and controlled fixtures.
5. Enable source-review client submission only in a **distinct later Founder-approved PR**, after the backend + signed sessions are accepted. A human-reviewed source does **not** prove regulator recognition or scholarship availability.

**Why frontend first?** The current Production A1.5 client still patches review status metadata that the proposed backend revokes. Applying backend restrictions first creates a known Admin draft edit regression, even though isolated SQL CI passes.

## D. Incident containment vs rollback

**Before SQL COMMIT:** if any migration statement or assertion fails, roll back the *entire* transaction, then independently confirm that all four original table row counts, RLS grants, and publishing CHECK are unchanged. A CI `BEGIN/ROLLBACK` test demonstrates this principle only in the isolated PostgreSQL container.

**After SQL COMMIT but BEFORE enabling client review:** keep review UI disabled; confirm safe draft editing. If RPC misuse, approval discrepancies or inconsistent ACLs occur, the containment option (requiring a separately authorized exact SQL change) is to **REVOKE EXECUTE** from `authenticated` for the exact review function while preserving audit history and staying fail-closed. Do **NOT** restore broad status UPDATE grants, delete audit events, truncate tables, remove the publishing guard, or drop audit-related schema as a quick 'rollback'.

**After actual editorial decisions are stored:** there is no safe automatic reversal of historical audit entries. Keep the append-only records (including legitimate correction/revocation events in a later reviewed change), and design a compensating/forward-fix migration as a distinct authorized change. A rollback that re-enables unrestricted Admin PATCHs would defeat the security objective.

**Disaster recovery:** only when data/schema truly needs recovery and the Founder approves, exercise a **separately rehearsed** restore against an isolated target and compare accounts, schema, ACLs, source rows, events, storage assets, and time range. The Founder's export is **not yet proven restorable**; DO NOT automatically restore an old daily snapshot onto Production. Old Oct 25 02:16 UTC backup predates known registry rows and would lose data.

## E. Observability & acceptance (must retain evidence)

| Gate | Proof required | Status |
| --- | --- | --- |
| Current read-only schema snapshot | 39 columns, existing fingerprints, 4/12 RLS, 1/1/1/0 counts | **Verified** |
| Historical ledger adoption | Provider-runner evidence + safe no-replay baseline | **Unknown** |
| Export integrity & isolated restore | Local controlled restore and secret-safe log only | **Not verified** |
| Synthetic nonempty-data A1.6.2 migration | PostgreSQL CI success incl prior data and full DDL abort | **Verified on isolated prototype** |
| Post-commit RPC incident pause | exact `REVOKE EXECUTE`, no audit loss; SQL-role test only | **PASS in isolated PostgreSQL CI run 40201265466** |
| Review-RPC `SECURITY DEFINER` owner/EXECUTE | owner restrictions and function ACL manually verified | **Pending** |
| Compatible frontend as Production | PR #28 merged and actual Admin draft regression test | **Not deployed** |
| Real signed JWT admin/non-admin | actual PostgREST on guarded nonempty test records, denial & audit checks | **Not tested for A1.6.2** |
| Controlled Production DB release | distinct Founder approval for exact SQL + checkpoint | **Not authorized** |
| Public university publishing | explicitly out of scope; database CHECK remains | **Blocked intentionally** |

The test CI job is **not** the original export, a recovery rehearsal of secrets, a complete post-commit down-migration or real-world university verification.


## F. Second isolated security audit — passed (2026-10-25)

GitHub PR #27 head `637558280ce9718e78c091229e25bf5f6aa99edb`,
GitHub Actions run **40201265466** finished **SUCCESS**.

Additional disposable PostgreSQL 17 checks now assert:
- The privileged review RPC is `SECURITY DEFINER` with a pinned **empty** search path; its function ACL grants neither implicit `PUBLIC` nor explicit `anon` execution, while `authenticated` can call the **role-checked** RPC.
- The review-events table has RLS enabled; `anon` has no table privileges and `authenticated` cannot directly insert, update or delete audit records.
- Four registry insert/edit guard triggers are enabled, and their helper functions are ordinary **SECURITY INVOKER**.
- The sensitive fields remain unwriteable by direct Admin SQL-role UPDATE, but the safe five-field draft update still succeeds.
- Post-commit incident **RPC containment rehearsal** revokes `authenticated` function EXECUTE, verifies a simulated Admin cannot call it, confirms ordinary draft editing still works and no audit records are destroyed, then independently rolls back test-only changes.
- The nonempty synthetic preexisting 1/1/1/0 registry is preserved during migration and test transaction rollbacks, and the publication guard remains active.

**Limits:** This does **not** establish the actual `SECURITY DEFINER` function owner or schema privileges for the managed Lovable Cloud Production migration, because that function is not installed there. The isolated CI migration prototype creates functions as the CI DB owner; Production ownership/grants may differ. This does not establish the restore correctness of the Founder's private export, true concurrent review behavior under live traffic, or real signed-JWT authorization for A1.6.2. A `REVOKE EXECUTE` incident pause is **containment**, not reversal of a committed DDL migration.

**Production unchanged:** PRs #26, #27 and #28 remain Draft/unmerged; latest observed Vercel Production commit remains `bd811d8c2000d19aa72f2cd91fba8cf3e4c4560a`, READY. No Production SQL/DDL/grant migration performed.
