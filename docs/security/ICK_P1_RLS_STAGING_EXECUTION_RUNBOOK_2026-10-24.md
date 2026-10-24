# ICK Opportunities — P1 RLS Staging Test Execution Runbook

**Date:** 2026-10-24  
**Status:** PREPARED / NOT EXECUTED AGAINST REPLACEMENT POLICY  
**Parent PR:** #20, documentation-only Draft PR  
**Current production backend:** Lovable Cloud (Founder-approved Option A).  
**Intended test target:** Separate Lovable project `ICK Opportunities - Security Staging`, project ID `887e7515-30c6-4fa3-bafc-fb8d8d610315`.

> **Do not run any of these test activities on Production, Vercel Preview, or the unrelated standalone ICK Technologies Supabase account.** A branch/preview is not proof of an isolated database. No one should paste scripts into the Lovable production SQL editor. Any live production migration still requires *separate explicit Founder approval* and formal backup/rollback review.

## 1. Current evidence and precise blocker

Production and Security Staging Lovable Cloud databases have different PostgreSQL server addresses and versions (**17.6** vs **17.11** at inspection) and distinct configured project refs (`xzxfodukvzzfwbwokhxt` vs `ckdfdjvlqvopzlqtwapf`). Staging is a candidate for controlled tests. Vercel environment metadata lists `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` for **both Production and Preview**; never assume a feature preview safely points at staging.

Earlier staging-only tests:
- **9/9** in-memory predicate cases matched expected proposed visibility. This was not an applied RLS policy test.
- Rollback-only fixture test with **`SET LOCAL ROLE anon`** showed **3 of 4** synthetic records readable under the *old* policy (including active unverified and active unpublished).
- Equivalent fixture test with **`SET LOCAL ROLE authenticated`** also showed **3 of 4** visible; there was **no signed-in JWT**.
- Both SQL test strings ended with `ROLLBACK`. After the anonymous test a separate query independently verified **zero remaining rows**. A post-authenticated-test independent readback was **not achieved** due to free-plan database action quota.
- Read-only privilege inspection showed **staging `anon` has table-level `INSERT` grant**; production `anon` did not. Actual anonymous INSERT capability has *not* been tested. RLS should reject it under the currently observed admin-only INSERT policy, but the effective REST permission still requires a negative test.
- Staging previously had **0 `auth.users` and 0 admin assignments**. This is why an actual admin/JWT check has not yet been performed.

**Latest attempt (2026-10-24):** A staging-only **readback SELECT** to confirm the second rollback was refused by the Lovable **free-plan MCP database action limit**. The provider explicitly reported that the query **was not executed**. **NO new RLS test, ALTER POLICY, data insert, migration or production change occurred in this attempt.**

### Follow-up gate outcome — independent readback still pending

A further **read-only** preflight query was attempted against the connected **Security Staging** Lovable Cloud database to check both the remaining synthetic fixture count and the current public RLS predicate. Lovable rejected it under the **free-plan database action quota**, explicitly indicating **the query was not executed**. This attempt did not access or modify Production and did not create an authorization test account.

**Gate 1 (post-rollback readback): BLOCKED, NOT PASSED.** The same first-stage gate must be completed when read-only database access is permitted. Do not re-run writes to "test" a potentially dirty staging environment merely because the old transaction ended with `ROLLBACK`; verify the current persisted row count first.

**Prior verified evidence remains unchanged:** the anonymous and authenticated SQL-role tests demonstrated that the pre-remediation RLS policy exposes synthetic active/unverified and active/unpublished rows in Staging. The replacement RLS policy and real API/JWT role matrix remain **untested**. The draft PR contains **only documentation**, not an applied security fix.

## 2. Mandatory preflight BEFORE any future staging write

1. Confirm the target Lovable project ID and its actual runtime PostgreSQL server identity. Only proceed if it matches the separate Security Staging project; never run the test in the primary Lovable project or Vercel Preview.
2. Confirm a read-only `count(*)` gives **0 remaining `ICK_STAGING_%_ROLLBACK_TEST` fixture rows**. Do not assert cleanup success until this check returns.
3. Confirm the active public policy from `pg_policies`, current table grants, presence of `auth.users`/admin fixtures, and deployed schema compatibility. Record only safe metadata and aggregate counts.
4. Agree on a rollback procedure and ensure no real people or production data are in the staging test environment. Test any proposed policy change inside **one short-lived database transaction that always ends in `ROLLBACK`** before preparing any durable staging migration.
5. Do not spend money, purchase Lovable credits, trigger production deploys, or reveal service-role secrets/JWTs during testing.

### Read-only verification checklist

```sql
-- Security Staging only. READ-ONLY.
SELECT
  count(*)::integer AS total_rows,
  count(*) FILTER (
    WHERE organization LIKE 'ICK_STAGING_%_ROLLBACK_TEST'
  )::integer AS remaining_rollback_fixtures
FROM public.opportunities;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'opportunities'
ORDER BY policyname;

SELECT
  has_table_privilege('anon', 'public.opportunities', 'SELECT')
    AS anon_select_grant,
  has_table_privilege('anon', 'public.opportunities', 'INSERT')
    AS anon_insert_grant;
```

## 3. Planned test of the proposed policy — NOT EXECUTED

**Only after preflight succeeds and the staging-only target is reverified:**

A. A qualified reviewer checks the latest proposal in `docs/security/ICK_P1_PUBLIC_OPPORTUNITY_RLS_REMEDIATION_PLAN_2026-10-24.md` against deployed schema.

B. In **isolated staging**, create minimal synthetic opportunity rows within a short-lived transaction and apply the **candidate** `ALTER POLICY "Public can view live opportunities" ...` in the **same transaction**. Run role-specific `SELECT` checks using `SET LOCAL ROLE anon` / `SET LOCAL ROLE authenticated`, then `ROLLBACK`. Confirm that no policy, row or role change persists using fresh metadata and row-count queries. These SQL-role checks are **not replacements for actual signed-in JWT tests**.

C. For each case below confirm both query success and row visibility (a successful HTTP 200 with zero rows is not necessarily evidence of unrestricted access):

| Synthetic opportunity state | Expected public visibility after proposed policy |
| --- | --- |
| Draft awaiting review | HIDDEN |
| Active but unverified | HIDDEN |
| Active verified, `published_at` null | HIDDEN |
| Active verified, `published_at` in future | HIDDEN |
| Active verified, `reviewed_by` or `reviewed_at` missing | HIDDEN |
| Active verified, reviewed and published, valid future deadline | VISIBLE |
| Active verified, reviewed and published, deadline null | VISIBLE |
| Active verified, reviewed and published, expired deadline | HIDDEN |
| Rejected, otherwise reviewed | HIDDEN |

D. Observe **zero persistent synthetic rows** and confirm that the original `pg_policies` definition is restored after the rollback. If restoration cannot be independently verified, mark the gate **BLOCKED** and do not advance.

## 4. Planned HTTP / JWT tests — NOT EXECUTED

Use the **Staging project's own** publishable key and URL only after verifying those values resolve to the staging backend. Do not log, commit, screenshot or transmit authentication tokens. This requires staging-only test identities, not real user accounts.

- **Unauthenticated visitor:** direct Data API requests for approved and draft fixture IDs; approve only allowed rows; attempt unauthorized insert and confirm denial with no row created.
- **Ordinary signed-in staging user:** real session/JWT; list/details/search visibility same as anonymous; unauthorized create/update/delete must fail.
- **Admin staging identity:** obtain admin privilege only through the documented privileged assignment process; review queue remains readable and admin tasks function as designed; verify audit entries and backend restrictions.
- **Privileged server account:** verify server-only access separately, with credentials never delivered to browser code.

Database SQL execution as the `postgres` service operator with `SET ROLE` alone does **not** prove these API/JWT cases. No accounts, role assignments, HTTP API requests or RLS policy changes are claimed by this runbook.

## 5. Release gate

Do **not** update Production or merge executable migrations until all are recorded as PASS:

- [ ] Clean staging readback (including the earlier second transaction).
- [ ] Runtime staging environment isolation including API bindings and credentials.
- [ ] Candidate policy transaction/rollback tests passed and rollback independently verified.
- [ ] HTTP/JWT role matrix passed; `anon` SQL grant drift reviewed and resolved in separate safe change if necessary.
- [ ] Old active/publicly visible production records re-audited for visibility regression; no fabricated historical approvals.
- [ ] Backup/recovery plan and separate transactional review/audit fix reviewed.
- [ ] Founder explicitly approves an exact production migration after seeing test evidence.

**Actual status as of writing:** **P1 gap VERIFIED**. Predicate-unit and old-policy SQL-role tests **PASSED/REPRODUCED**. New-policy and full API/JWT tests **NOT RUN**. Production remains **UNCHANGED**. PR #20 stays **DRAFT**.
