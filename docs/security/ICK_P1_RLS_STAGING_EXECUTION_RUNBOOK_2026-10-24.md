# ICK Opportunities — P1 RLS Staging Test Execution Runbook

**Date:** 2026-10-24  
**Status:** PREPARED / NOT EXECUTED AGAINST REPLACEMENT POLICY  
**Parent PR:** #20, documentation-only Draft PR  
**Current production backend:** Lovable Cloud (Founder-approved Option A).  
**Intended test target:** Separate Lovable project `ICK Opportunities - Security Staging`, project ID `887e7515-30c6-4fa3-bafc-fb8d8d610315`.

> **Do not run any of these test activities on Production, Vercel Preview, or the unrelated standalone ICK Technologies Supabase account.** A branch/preview is not proof of an isolated database. No one should paste scripts into the Lovable production SQL editor. Any live production migration still requires *separate explicit Founder approval* and formal backup/rollback review.

## 0. Latest verified execution result — 2026-10-24

**STAGING-ONLY ACTUAL CANDIDATE POLICY TEST, TRANSACTIONAL AND REVERTED.**

- **Preflight read-only PASS:** 0 opportunity rows, 0 previous rollback-test rows, public SELECT predicate still the original permissive one.
- Executed a staging SQL **`BEGIN`**, inserted **9 synthetic opportunity fixtures**, performed the candidate **`ALTER POLICY`** in the same transaction, set the PostgreSQL role to **`anon`**, read the test cases and ended with **`RESET ROLE; ROLLBACK;`**.
- Actual RLS behavior under candidate policy: **2 visible legitimate fixtures out of 9 total**, **0 unexpected visible fixtures**. **PASS under the SQL `anon` role**.
- **Independent read-only post-test verification PASS:** staging has **0 total rows**, **0 remaining fixtures**, and **the original public policy is restored**. No policy mutation, test data or migration persisted.
- Candidate policy test under SQL **`authenticated`** role **was NOT executed** because Lovable rejected the query at the free-plan action limit. Do not count it as a pass, or imply a failed/half-applied migration.
- Real HTTP/JWT (anonymous, ordinary signed-in and admin), service role separation, negative INSERT grant behavior, complete regression and production release tests **NOT RUN**. No credentials retrieved or real identities created. **No Production change**.

**Status transition:** The earlier section describing rollback-readback as pending is a *historical state* from an earlier check; the clean rollback and policy restoration have now been independently verified. Candidate anonymous SQL-role test has passed, but the P1 release gate **still does not pass**. Continue only with tests authorized for separate Staging; no production SQL without separate approval.

## 0A. Additional 2026-10-24 staging test result — authenticated SQL role

**NEW VERIFIED PASS:** Staging-only, transactional **proposed `ALTER POLICY`** test succeeded under PostgreSQL SQL role **`authenticated`**. The nine fabricated fixtures and candidate policy existed **only inside `BEGIN ... ROLLBACK`**. The `authenticated` role read **2 expected approved/published rows** and **0 unexpected rows**; `auth.uid()` was null (no JWT or actual user session). **Independent read-only post-test query confirmed 0 remaining records and restoration of the original RLS policy.**

**Admin and API gate not passed:** At test time Staging had 0 `auth.users` and 0 admin assignments. An actual admin/signed-in JWT session or REST persona test remains **NOT EXECUTED**. Read-only `pg_policies` inspection verified the admin policies call `has_role(auth.uid(), 'admin'::app_role)`.

**Additional environment drift:** Staging currently permits the `anon` SQL role to execute `public.has_role(uuid, app_role)` (a public-schema `SECURITY DEFINER` helper that accepts a user-supplied UUID); a read-only check showed that **Production `anon` does NOT have this EXECUTE privilege**. Staging also had `anon` table-level `INSERT` grant while the earlier verified Production check did not. These differences matter when interpreting future staging persona results. **Do not make grant changes without reviewed scope and approval.** No real users, production table data, authentication tokens or actual RPC probes were involved.

**Current candidate-policy verification summary:** `anon` SQL-role candidate RLS test **PASS**, `authenticated` SQL-role candidate RLS test **PASS**, both independently restored via readback **PASS**. Full HTTP/JWT and admin regression **BLOCKED/NOT RUN**, Production rollout **NOT AUTHORIZED**.

## 0B. API/JWT readiness — latest 2026-10-24 read-only check

A targeted read-only attempt to inventory the concrete PostgreSQL table `relacl` and function `proacl` for both Lovable Production and Lovable Security Staging was **blocked by Lovable's free-plan MCP database action limit before either query was executed**. Thus the origin of the staging-vs-production grant drift is **NOT VERIFIED**. Prior independently observed differences remain: staging grants `anon` table-level `INSERT` on `opportunities` and `EXECUTE` on `public.has_role`, while production did not at the preceding observation.

Lovable project metadata shows Security Staging project `887e7515-30c6-4fa3-bafc-fb8d8d610315` is **not published** (`is_published=false`), is in **`workspace_edit`** visibility, and has a Lovable-generated preview URL. An external read-only attempt to open that preview returned **inaccessible** in the available browsing client. Therefore this review **did not reach the staging website from outside** and did **not** validate HTTP/PostgREST/real JWT identities. The separate ICK Opportunities Lovable project also reports `is_published=false`; this **does not contradict** the separate production Vercel deployment, which is a different hosting workflow. **Do not publish staging or enable public exposure merely to run a test** without first validating endpoint bindings, test data, access controls and explicit scope approval.

Until verified staging-only API connectivity and secure synthetic test users exist, the real HTTP/JWT/admin role matrix stays **NOT TESTED**, even though `anon` and `authenticated` **PostgreSQL SQL-role tests of the proposed policy both passed with clean rollback**.

**Safe next action:** finish the read-only ACL provenance audit when the existing database action allowance permits; compare `PUBLIC` and direct grants with checked-in C5 migration intent and privilege inheritance. Do not replay migrations or try credentials/keys from Production.

## 0C. Independent staging source-snapshot and migration-provenance check — 2026-10-24

**Read-only Lovable project observations:**
- Staging project was created `2026-10-23T23:38:37.854Z`, project source snapshot ref `13653bfa5d63a4d05aadafe2ff355a44ea0911cd`, and Lovable reports `is_published=false`.
- A complete two-page file listing of **157 source files** in that Staging snapshot contained **`supabase/config.toml`** but **NO `supabase/migrations/` file entries**. The config contains separate project ID `ckdfdjvlqvopzlqtwapf`.
- The staging source `src/integrations/supabase/client.ts` obtains URL/key from runtime environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, server equivalents). It does **not** hardcode either the production or staging project ref. **A separate project ID in config.toml is not proof of the application's runtime API binding**. No environment variable values or secrets were inspected or copied.
- GitHub `main` **does** contain `supabase/migrations/20260904011046_f6bf51cb-ff57-4594-96d3-ea6278bd1383.sql` (the function `PUBLIC, anon` EXECUTE REVOKE) and `supabase/migrations/20261008100000_c5_tighten_database_privileges.sql` (the excessive table-GRANT cleanup). The Lovable source-file list being different from GitHub `main` does **NOT prove** that either database migration was never executed.

**Release implication:** The origin of the live Staging `anon` grants is still **UNKNOWN**, despite clearly verified grant drift. Do not infer migration history from source files alone, especially as this staged Lovable snapshot was created **after** the dated GitHub C5 migration and appears to be a separate source lineage. Proper evidence requires **read-only actual PostgreSQL ACL provenance and migration-history checks**, then targeted Staging-only design review. The first attempted `relacl`/`proacl` queries for both environments were rejected before execution by the provider's MCP quota; no SQL was changed.

**Additional caution:** The GitHub `docs/security/c5-tighten-database-privileges/rollback.sql` intentionally restores its historical *overly broad* privileges in an emergency. **Never execute that broad rollback just to align Staging**, and never merge it as a normal migration. It is not an appropriate fix for staging ACL drift.

**Result:** Source snapshot and runtime-config architecture **VERIFIED**; staging migration execution history and runtime API binding **NOT VERIFIED**; live SQL-role tests remain a pass, real HTTP/JWT/admin checks remain pending.

## 0D. Release STOP: verified Staging-versus-Production ACL mismatch — 2026-10-24

**Source:** independent non-mutating queries of actual PostgreSQL ACLs (`pg_class.relacl`, `pg_proc.proacl`, `aclexplode`) against **both** known Lovable Cloud projects; queries were successful. They did not read credentials or personal user rows.

- **Production `anon` on `public.opportunities`: `SELECT` only.** **Staging `anon`: all eight privileges (`SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN`)**. Staging `authenticated` also has all eight; Production `authenticated` has `SELECT, INSERT, UPDATE, DELETE`.
- **Staging `public.has_role`: `EXECUTE` granted directly to `PUBLIC` and `anon`** (also `authenticated` and `service_role`). **Production `public.has_role`: `EXECUTE` granted only to `authenticated` and `service_role` among inspected client roles (no `PUBLIC`, no `anon`).**
- The standard relation `supabase_migrations.schema_migrations` **exists on Production and does not exist on Staging**. This is a migration-tracking difference, **not** a complete historical record or evidence that migrations were never run.
- Live aggregate counts in that comparison: Production **14** opportunities and **10** auth users; Staging **0** opportunities and **0** auth users.
- A follow-up inspection of specific Production migration version rows was blocked by tool safety checks before execution; there is no verified version-by-version comparison.

**Classification: STAGING ACL PARITY FAIL / P1 HTTP-JWT TESTS BLOCKED**. Staging `anon` even holds direct `TRUNCATE` SQL permission, a class of capability not restricted by RLS; that alone is **NOT a proof** that the web Data API exposes `TRUNCATE`. Treat the grant as a hardening and test-equivalence issue, not as a demonstrated public exploit. Retain the two **PASS** rollback-only candidate-policy SQL-role SELECT tests, but do not promote them to a full authorization sign-off.

**Safe gates before any Staging ACL correction:**
1. Qualified review of full least-privilege ACL differences and documented GitHub C5 migration intent; avoid blind C5 replay and overly broad rollback.
2. Create a **small targeted Staging-only GRANT/REVOKE proposal** and complete privilege compatibility checks for normal users, admin workflows and required platform functions, with explicit Founder approval before running DDL.
3. Independently verify intended postconditions, negative API probes, proper JWT isolation, and controlled admin test identities (not currently present).
4. Keep production public SELECT policy and deployment unchanged until staging role/REST regression tests, backups and separate Founder production approval are complete.

**NO database/production changes were executed for this finding.** Only documentation on GitHub feature branch was updated.

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

### Earlier gate outcome — independent readback was pending then (now resolved above)

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
