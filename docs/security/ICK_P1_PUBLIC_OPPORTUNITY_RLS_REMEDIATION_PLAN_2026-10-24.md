# ICK Opportunities — P1 Opportunity Publication RLS Remediation

**Date:** 2026-10-24  
**Status:** DESIGN / SECURITY REVIEW ONLY. NOT DEPLOYED OR APPLIED.  
**Production code reference:** main @ 72b596fea8c807b4c0b84d5738b46825c4071e0c  
**Production backend:** Lovable Cloud database (retain under Founder-approved Option A).  
**Scope:** public SELECT policy for public.opportunities only. No University Registry migration.

> STOP: This document contains example SQL for future expert review and isolated staging tests. DO NOT execute its SQL against Lovable production, paste into a SQL editor, or move it into supabase/migrations without separately approved release controls, backups, test results, and explicit Founder authorization. A GitHub branch or Vercel Preview is NOT database isolation.

## 1. Verified evidence — 2026-10-24 live read-only queries

The authenticated Lovable project is **ICK-Opportunities** (project 433a53c8-8872-49f2-b7b8-3e8dc7e96e35), with Lovable Cloud database enabled and stack reported as supabase.

The live public SELECT policy metadata in `pg_policies`:

- Policy name: `Public can view live opportunities` on `public.opportunities`.
- Command: `SELECT`, roles: `anon, authenticated`.
- Predicate: `status = 'active' AND (deadline IS NULL OR deadline >= CURRENT_DATE)`.
- **Missing publication checks:** `verified_status = 'verified'`, non-null/non-future `published_at`, and review metadata.
- Independent `Admins can view all opportunities` policy permits admin review; it must remain available after public SELECT tightening.
- Table has RLS enabled, `anon` has SELECT but no INSERT; the public SELECT policy thus matters for direct REST access as well as UI queries.

Only **aggregate records**, no private contents, were read:

| Current database snapshot | Count |
| --- | ---: |
| All opportunity rows | 14 |
| Draft / pending_review / published_at null | 13 |
| Expired / pending_review / published_at present | 1 |
| Active rows meeting current public policy | 0 |
| Active rows meeting current public policy but with unverified/unpublished metadata | 0 |

The expired + pending_review + published timestamp combination warrants later **editorial data-integrity review**. It is currently excluded by the public `active` requirement.

**Impact assessment:** An opportunity marked active without completing publication review *could* be exposed through current live RLS, even if specialist frontend search hides it. We have **not found an actually publicly eligible row in this snapshot**, and have **not demonstrated exposure of any user's private data**. The policy is a genuine guardrail gap, not evidence of a historic leak.

### Separate staging environment discovery

The Lovable project **ICK Opportunities - Security Staging** (project 887e7515-30c6-4fa3-bafc-fb8d8d610315) separately reports a supabase-backed database. A read-only table-name query found existing opportunities and audit tables; a count query found **0 total opportunity records** in that project. This establishes that our two read-only contexts currently return different datasets, **not yet** that all hosting, secrets, auth, migrations, and background jobs are independently isolated. Explicitly verify that preview builds cannot reach the production database before any staging write or migration.

## 1A. Staging isolation check — 2026-10-24 read-only follow-up

**Founder authorization in chat:** Proceed with *staging verification and safe tests* for the P1 RLS proposal. **Production writes remain prohibited.**

### Source-level staging mapping — confirmed

| Evidence | Production Lovable project | Security Staging Lovable project |
| --- | --- | --- |
| Project ID | `433a53c8-8872-49f2-b7b8-3e8dc7e96e35` | `887e7515-30c6-4fa3-bafc-fb8d8d610315` |
| Project name | ICK-Opportunities | ICK Opportunities - Security Staging |
| Lovable Cloud DB enabled | Yes | Yes |
| Backend stack | supabase | supabase |
| `supabase/config.toml` project ref | `xzxfodukvzzfwbwokhxt` | `ckdfdjvlqvopzlqtwapf` |
| Last reported opportunity rows from read-only session | 14 | 0 |

The two projects have **different Lovable IDs and different repository Supabase project refs**; their recorded opportunity counts were also different. This was **initial configuration evidence**; the independent PostgreSQL-instance check immediately below now provides stronger runtime database separation evidence, while deployment binding, background-job isolation and backups remain unverified. Both client files rely on `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment values rather than hardcoded refs. Do **not** treat a repository ref alone as definitive proof of deployed connection binding.

### Independent Lovable Cloud database-instance check — VERIFIED 2026-10-24

Read-only `SELECT current_database(), current_user, inet_server_addr(), current_setting('server_version')` completed **successfully on both actual Lovable Cloud projects** (no SQL writes, credentials, raw personal data or test fixtures).

| Property | Production Lovable Cloud | Security Staging Lovable Cloud |
| --- | --- | --- |
| PostgreSQL database name | `postgres` | `postgres` |
| Query role | `postgres` | `postgres` |
| PostgreSQL server address | **Different from staging** (raw IP withheld) | **Different from production** (raw IP withheld) |
| Server version reported | **17.6** | **17.11** |
| Connection verified via | Lovable project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35` | Lovable project `887e7515-30c6-4fa3-bafc-fb8d8d610315` |

**Conclusion:** This is strong **runtime evidence that these Lovable Cloud database connections target distinct PostgreSQL server instances**, beyond the separate repository project refs previously observed. It does **not** prove all Vercel Preview environment values, storage buckets, service-role integrations, cron jobs, edge functions, or production/staging auth identities are isolated. Treat **Lovable Security Staging project direct SQL** as the better candidate for future synthetic tests; never assume normal Vercel feature previews are staging.

A further read-only query against **Security Staging** confirms the same pre-remediation `Public can view live opportunities` SELECT predicate (active status + valid deadline only), as in production. No RLS change was made.

**Remaining access constraint:** Subsequent read-only queries were rejected by the Lovable free-plan database action limit **without execution**. Therefore permissions/persona tests and positive/negative test-fixture cases are still **NOT RUN**. No charge or upgrade was initiated.

### Vercel project environment — additional read-only evidence

The production Vercel project `ick-opportunities` was inspected through the Vercel environment **metadata list with decryption disabled**. Three **sensitive** variable names were present:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

**All three Vercel variable records list both `production` and `preview` as targets.** No separate Git-branch override was apparent among those returned metadata records. Variable **values and credentials were not retrieved or disclosed**.

**Security implication:** Treat Vercel Preview deployments of the *production repository* as **potentially connected to the production Lovable Cloud database**, even when source code is on a feature branch. A successful feature-branch preview or distinct Lovable Security Staging project does **not** by itself prove Vercel preview database isolation. **Never insert synthetic test rows, run RLS policy writes, migrate schemas, or exercise privileged test accounts in ordinary Vercel Preview until its resolved backend project ref is independently verified.**

**Safe staging target candidate:** The *separate* Lovable Security Staging project, which reports a different `supabase/config.toml` project ref. Its runtime bindings still require verification. Do not print decrypted environment-variable values during testing; compare only nonsecret project identities or backend-connection identifiers.

### Tooling blocker — no changes made

During the follow-up, the Lovable Cloud MCP query tool returned **free-plan database action limit reached** before any new identity, policy, or runtime-isolation queries could execute. The provider confirmed **those queries were not executed**. No SQL writes, test fixtures, `ALTER POLICY`, migrations, or changes to either database were attempted. The staging RLS persona matrix remains **NOT TESTED**.

**Consequence:** Do not proceed with staging data writes or DDL until environment isolation is independently confirmed and database action access is available. Do not purchase an upgrade merely for this check; an approved free/local test environment is an alternative after prerequisites and tooling are verified.

### Next safe checks when access is available

1. In **read-only mode**, confirm actual database connection identities and server-side environment bindings for both Lovable projects without revealing credentials.
2. Confirm the staging project cannot access production auth, database or storage with its client credentials.
3. Establish an isolated, synthetic-data-only staging test fixture and reviewed restoration strategy.
4. Exercise `anon`, signed-in ordinary-user and admin role access against the proposed RLS; record negative and positive tests and ensure no production data is touched.
5. Require Founder review again before any permanent staging schema modification or production rollout. A successful Vercel build is not evidence that RLS passes.

## 1B. P1 predicate-only synthetic tests — 2026-10-24

**TEST EXECUTED** directly against the *separate Lovable Security Staging PostgreSQL server* as a **read-only `WITH cases AS (VALUES ...)` query**. The query used nine fabricated in-memory cases; no persistent records, identities, permissions, policies, or tables were modified.

For each fabricated case the query compared (A) the currently deployed *old* public rule and (B) the **proposed** stricter predicate (active, verified, not-future published, reviewed_by, reviewed_at, deadline) with an expected visibility value:

| Test case | Old rule visible? | New proposed rule visible? | Expected? |
| --- | --- | --- | --- |
| Draft awaiting review | No | No | PASS |
| Active but unverified | **Yes** | No | PASS |
| Active, verified, publication timestamp missing | **Yes** | No | PASS |
| Active, verified, publication timestamp in future | **Yes** | No | PASS |
| Active, verified, review metadata missing | **Yes** | No | PASS |
| Active, verified, reviewed, future deadline | Yes | Yes | PASS |
| Active, verified, reviewed, no deadline recorded | Yes | Yes | PASS |
| Active, fully reviewed, past deadline | No | No | PASS |
| Rejected, otherwise reviewed | No | No | PASS |

**Result: 9 of 9 pure-predicate unit cases passed.** Under the deliberately simulated conditions, the old rule would have made **four** invalid specimens visible; the proposed expression suppressed those four while preserving the two valid specimens.

**IMPORTANT SCOPE LIMITATION:** These were synthetic **boolean predicate evaluations**, **NOT** row-level access tests under actual `anon`, normal `authenticated`, admin and service-role sessions. The proposed `ALTER POLICY` SQL has **not** been run, database migration has **not** been tested, and successful predicate checks **do not prove** safe role grants, RLS combination behavior, frontend compatibility or availability of official scholarships.

### Additional staging grant drift detected

A staging-only, read-only privilege check returned:

- RLS **enabled** on `public.opportunities`.
- `anon` has `SELECT` privilege **and also `INSERT` privilege at the SQL GRANT level**.
- `authenticated` has `SELECT` and `INSERT` privileges.
- The staging RLS `INSERT` policy was reported as `TO authenticated` with an admin-role predicate, and there was **no anonymous INSERT policy in the earlier staging inventory**.

**Interpretation:** An `anon` table-level `INSERT` grant in this environment is unnecessarily broad compared with the earlier production check (`anon` INSERT was false). Its existence **does not by itself prove anonymous INSERT can succeed**, because RLS also controls row writes; staging testing must independently demonstrate denial with an anonymous session. Treat the difference as **permission drift requiring review**, and do not copy staging grants blindly into production. **Do not revoke privileges yet** without the intended policy baseline and impact review.

### Current release gates

- [x] Distinct PostgreSQL server identities verified via Lovable.
- [x] Nine in-memory predicate truth-table cases passed, with no write.
- [x] Staging SQL GRANT drift detected for `anon` INSERT.
- [ ] Actual staging policy change tested against synthetic persistent/transactional fixtures with rollback controls.
- [x] Transaction-scoped SQL-role RLS reads under `anon` and `authenticated` (no JWT, old policy only); the exposure weakness was observed on staging.
- [ ] Real HTTP/JWT sessions for anonymous, signed-in, admin and service role; negative INSERT and replacement policy tests remain.
- [ ] Full app regression tests, backups, restoration and Founder-approved production change.

## 1C. Transaction-scoped PostgreSQL-role RLS smoke tests — VERIFIED 2026-10-24

**Scope:** separate Lovable **Security Staging** database only (project `887e7515-30c6-4fa3-bafc-fb8d8d610315`). These tests used **`BEGIN; ...; SET LOCAL ROLE <role>; SELECT ...; ROLLBACK;`**, with fabricated opportunity rows created *inside the same rollback-only transaction*. `SET LOCAL ROLE` impersonated PostgreSQL roles for RLS evaluation; **it did NOT log in as a real Supabase user or provide a signed JWT**. Production SQL, GitHub `main` and deployments were untouched.

**Preflight read-only findings:** the staging database returned **0 opportunity records, 0 authentication users and 0 admin-role assignments**, and its `opportunities` table had one ordinary BEFORE UPDATE timestamp trigger, not an INSERT trigger. The `anon` table-level `INSERT` grant remains a separate security concern; no anonymous INSERT attempt has been tested.

Four isolated fixtures were inserted into each SQL test transaction (all test-only):
1. `draft / pending_review`;
2. `active / pending_review` with no publication timestamp;
3. `active / verified` without publication timestamp;
4. `active / verified` with non-future `published_at`, populated review metadata and valid future deadline.

| Transaction role | Draft visible | Active unverified visible | Active verified but unpublished visible | Reviewed + published visible | Outcome |
| --- | --- | --- | --- | --- | --- |
| `anon` (SQL role, no JWT) | No | **YES** | **YES** | Yes | **LIVE STAGING RLS WEAKNESS CONFIRMED** |
| `authenticated` (SQL role, `auth.uid()` null) | No | **YES** | **YES** | Yes | **LIVE STAGING RLS WEAKNESS CONFIRMED** |

Each test query returned **3 visible fixture rows** from 4 inserted; `draft` was hidden. These results are evidence of **actual RLS behavior under the pre-remediation staging policy**, not only a boolean expression check. Both transactions explicitly ended with `ROLLBACK`; a separate **read-only readback immediately after the `anon` transaction confirmed 0 total opportunity rows and 0 remaining test records**. A second readback after the `authenticated` transaction was **blocked by Lovable free-plan database action quota before it executed**; the in-transaction `ROLLBACK` ran, but an independent second readback was not obtained. Therefore persistent state after the second test **still requires confirmation**. Do not mark a cleanup verification complete merely because the SQL specifies rollback.

**What this DOES and DOES NOT establish:**

- **VERIFIED in staging:** anonymous SQL role and ordinary `authenticated` SQL role see active unverified/unpublished fixtures through the old real RLS policy. This concretely demonstrates the same permission gap previously observed by policy inspection.
- **NOT VERIFIED in production via fixtures:** no active/publicly visible production rows were observed at prior aggregate inspection; do **not** claim a production data leak occurred.
- **NOT TESTED:** REST/HTTP with actual Supabase anon/publishable key, real signed-in users, a real admin account/JWT, `service_role` operations, negative INSERT under anonymous role, grant regressions, and the replacement policy after `ALTER POLICY`.
- **NO PROD WRITE:** No production changes were made. **NO POLICY CHANGE:** Neither environment had its RLS policy altered. No staging data was committed intentionally.

**Next safe gate:** At next available read-only database action, confirm staging has 0 remaining fixtures. Then independently test a real anonymous request and a deliberately created **staging-only** signed-in/admin account under secure credentials and explicit approval. Test the revised RLS on staging only after review of proper isolation, backup/rollback and permission impact. No automatic migration or policy deployment.

## 1D. Proposed policy applied **temporarily**, anonymous SQL-role test PASSED — 2026-10-24

**Important scope:** This is the *dedicated Lovable Security Staging PostgreSQL server* only, not ICK Opportunities Production or a Vercel preview. The test's DDL and nine synthetic fixture inserts were inside **one `BEGIN ... ROLLBACK` transaction**, so it was designed to leave neither the candidate policy nor synthetic records persisted. No real user accounts or credentials were used.

**Preflight finally passed, read-only:** Before running the candidate test, Staging returned **zero total opportunity rows**, **zero leftover previous rollback fixtures**, and the unchanged old `Public can view live opportunities` policy predicate (`status='active' AND (deadline IS NULL OR deadline>=CURRENT_DATE)`).

**Candidate RLS smoke test (actual temporary `ALTER POLICY` in Staging):**
- Nine fabricated opportunities were inserted *in the transaction*, representing unreviewed drafts; active-unverified; active-verified-unpublished; future publication timestamp; missing review metadata; two legitimate reviewed/published rows (deadline valid or NULL); expired; and rejected.
- The proposed `ALTER POLICY ... TO anon, authenticated USING (active AND verified AND published_at nonfuture AND reviewed_at/ reviewed_by populated AND deadline valid)` was executed **in the same transaction**, with no permanent migration recorded.
- `SET LOCAL ROLE anon` selected **exactly 2 of 9** fixtures: **2 expected valid rows, 0 unauthorized rows**. This is an **actual candidate-policy RLS SQL-role pass**, distinct from the earlier pure-predicate simulation.
- The transaction explicitly ended with `RESET ROLE; ROLLBACK;`.
- **Independent read-only readback PASSED:** Staging again returned **0 total opportunity rows, 0 remaining candidate test fixtures, and the original public SELECT policy**. Thus both fixture rollback and the old RLS policy restoration were separately confirmed.

**Caveats:** This does **not** test a real anonymous HTTP/PostgREST request with a publishable key; it does not exercise admin user privileges, signed JWTs, production, or frontend regression. SQL `anon` role simulation and actual browser/API authentication are separate tests. A separate attempt to test the candidate policy under SQL role `authenticated` was **REJECTED BEFORE EXECUTION** by the Lovable free-plan MCP action quota. Do not claim it passed or that data from it needs cleanup: **that query was not run**.

**Result:** A1.4/P1 proposed public RLS policy now has a **verified staging anonymous SQL-role transaction test and verified independent rollback**. The **production policy has not been modified**, and the P1 release gate is **STILL BLOCKED** on authenticated/admin/HTTP tests, grants, recovery and explicit Founder production approval.

## 1E. Proposed policy temporarily tested with authenticated SQL role — VERIFIED 2026-10-24

**Execution target:** Lovable Security Staging PostgreSQL project `887e7515-30c6-4fa3-bafc-fb8d8d610315`, **not Production**.

**Read-only preflight PASS:** Staging had **0** opportunity rows, **0** remaining earlier candidate fixtures, the **original** live public SELECT policy, **0** `auth.users` and **0** admin role assignments. No production data were copied.

**Transaction-only real RLS test:** Inside `BEGIN ... ROLLBACK`, inserted nine fabricated opportunity rows, ran the **proposed `ALTER POLICY`**, and selected with `SET LOCAL ROLE authenticated` (PostgreSQL SQL role, **no actual JWT: `auth.uid() IS NULL`**). The query reported:

| Observation | Result |
| --- | --- |
| Synthetic rows inserted inside transaction | 9 |
| Allowed approved and published rows visible | **2** |
| Unexpected/unapproved rows visible | **0** |
| SQL role | `authenticated` |
| Real authenticated Supabase user/JWT | **NO** |

**Independent post-test readback PASS:** **0 total opportunities**, **0 remaining authenticated-test fixtures**, and **the original live public SELECT predicate restored**. The proposed policy is **not installed** in Staging or Production.

**Scope/caveat:** With the previous Staging `anon` SQL-role candidate test also **PASS**, both PostgreSQL SQL roles have now passed controlled candidate-policy read tests and rollback. These tests **do NOT** prove signed-in-user JWT/HTTP behavior, admin read/review operations, publish/audit atomicity or production release readiness.

### Additional VERIFIED staging-vs-production authorization drift

A fresh read-only `pg_policies` inspection in Staging confirmed that admin SELECT/INSERT/UPDATE/DELETE operations use `public.has_role(auth.uid(), 'admin'::app_role)`; ordinary users have a separate `Users can read their own roles` policy on `public.user_roles`. With **zero staging users and zero admin-role assignments**, there is no real admin session to exercise, and a SQL-role `authenticated` smoke test alone cannot stand in for that test.

Read-only metadata/function-definition inspection found:

| Control | Staging | Production | Significance |
| --- | --- | --- | --- |
| `anon` table-level INSERT grant on `public.opportunities` | **Yes** | **No** (prior verified production check) | Grant drift; no proof of successful anonymous INSERT because RLS still restricts it. |
| `public.has_role(uuid, app_role)` is `SECURITY DEFINER` | **Yes** | **Yes** | Sensitive privilege-boundary helper; examine the exact intent and exposure. |
| `anon` can EXECUTE `public.has_role` | **Yes** | **No** | **Additional staging permission drift**; production metadata does **not** show anonymous execution allowed. |
| `authenticated` can EXECUTE `public.has_role` | **Yes** | **Yes** | Expected role-dependent RLS use; still requires JWT/persona testing. |

The Staging function accepts a **caller-supplied user UUID** and checks that user's membership in `public.user_roles`. Since staging permits anonymous execution, this is a **potential role-membership disclosure/oracle in Staging if target UUIDs become known**, not a verified production exploit. Do **not** claim production anonymous RPC exposure: read-only production metadata found `anon` **cannot** execute the function. No vulnerable endpoint was exploited or user records accessed.

**Action gate:** Reconcile staging grants/role-helper behavior with the intended production security baseline **before** interpreting a staging HTTP/JWT test as production-equivalent. Do not blindly copy either environment's GRANTs or revoke privileges without a separate impact review and explicit authorization.

## 2. Existing application behavior and limitations

- The general public page read functions `fetchPublicOpportunities()` and `fetchOpportunityById()` in `src/lib/opportunities.ts` use Supabase queries whose effective public visibility depends on database RLS.
- `src/routes/scholarship-navigator_.global-search.tsx` filters scholarships by `active`, `verified` and non-null `published_at` client-side. This is defense-in-depth but cannot secure the unfiltered data API.
- The review function in `src/lib/review.ts` updates an opportunity and then inserts an audit log in a **second request**, without checking the audit insertion error. Publication and audit are not currently guaranteed atomic.
- Existing PR #19 documents architectural work; **this PR is the distinct P1 policy remediation design** and must not be mistaken for completion of that architecture review.

## 2A. Additional P2 finding: public column minimization (CODE-LEVEL ONLY)

**New source inspection:** `src/lib/opportunities.ts` on GitHub `main` currently uses `.from("opportunities").select("*")` in both `fetchPublicOpportunities()` and `fetchOpportunityById()`. The checked-in generated `src/integrations/supabase/types.ts` says that an opportunity row includes internal-looking fields such as `created_by`, `reviewed_by`, `reviewed_at`, `discovered_at`, `source_id`, `relevance_score`, `nigeria_score`, `africa_score`, `remote_score`, and `global_score` alongside normal published listing fields.

**Risk / confidence:** **VERIFIED code-level design** and **potential P2 overexposure**, **NOT a demonstrated data leak**. PostgreSQL row-level security protects *which rows* can be read, but does not automatically restrict *which columns* of an allowed row can be returned. Earlier production metadata confirmed `anon` SELECT privilege at the table level. Since there were **zero publicly qualifying opportunities** in that snapshot, no concrete private fields were observed through a public API in this review.

**Separate remediation, not part of the P1 policy migration:** Agree on a minimum public field contract (`id`, `title`, `description`, `category`, `organization`, `country`, `deadline`, `official_link`, `benefits`, `eligibility`, and necessary public metadata). Inspect every public consumption site. Introduce an appropriately secured public projection/API (with a row-level filter, safe grants and RLS-preserving `security_invoker` where applicable), and verify raw table access is not still returning internal fields directly. Changing client code from `select("*")` to an explicit list improves least-privilege usage but **does not alone prevent direct PostgREST users from requesting other granted columns**. Do not revoke grants or change public API behavior until isolated staging tests and separate Founder authorization.

## 3. Proposed fail-closed public SELECT rule (NOT APPLIED)

The following is an **illustrative change for staging review only**. It requires a schema diff, explicit risk assessment, automated role-based tests and a migration generated via the installed Supabase CLI workflow before deployment.

```sql
-- EXAMPLE ONLY. NOT A PRODUCTION MIGRATION.
-- Requires isolated staging, restoration plan, Founder approval,
-- documented data impact, and test results BEFORE use.
BEGIN;

ALTER POLICY "Public can view live opportunities"
ON public.opportunities
TO anon, authenticated
USING (
  status = 'active'::public.opportunity_status
  AND verified_status = 'verified'::public.verified_status
  AND published_at IS NOT NULL
  AND published_at <= now()
  AND reviewed_at IS NOT NULL
  AND reviewed_by IS NOT NULL
  AND (deadline IS NULL OR deadline >= CURRENT_DATE)
);

COMMIT;
```

**Semantics:** the public can see only active, explicitly verified, non-future published, reviewed, and non-expired opportunity records. A reviewer/admin's own SELECT policy remains separate; PostgreSQL permissive policies OR together. This policy does **not** independently prove official-source evidence, admission availability, or website ownership. Publishing metadata is necessary but not sufficient for trustworthy editorial publication.

**Potential compatibility risk:** If previously published records lack `reviewed_by`, `reviewed_at` or `published_at`, the new rule hides them. Current snapshot has **zero active records**, but recheck live counts immediately before any migration and explicitly approve any remediation/backfill. **Never auto-fill review timestamps merely to preserve visibility.** This draft does not modify data or create triggers/RPCs.

## 4. Required staging tests BEFORE authorization to deploy

Use **synthetic rows and test identities only** (do not copy production personal data). First prove staging environment separation, and establish database backup/restore and a rollback plan. Prepare test data with distinct combinations:

| Synthetic case | Public SELECT expected | Admin SELECT expected |
| --- | --- | --- |
| Draft, pending_review, future deadline | HIDDEN | Visible |
| Active, pending_review, published_at set | HIDDEN | Visible |
| Active, verified, published_at null | HIDDEN | Visible |
| Active, verified, published_at in future | HIDDEN | Visible |
| Active, verified, published_at set, review metadata missing | HIDDEN | Visible |
| Active, verified, approved review metadata, future deadline | VISIBLE | Visible |
| Active, verified, approved review metadata, deadline null | VISIBLE | Visible |
| Expired or past deadline, otherwise reviewed | HIDDEN | Visible |
| Rejected, otherwise reviewed | HIDDEN | Visible |

Test `anon`, normal `authenticated`, admin and trusted server role separately: direct Data API SELECT by guessed ID; list, search, count, category filters; admin queue reads; denial of normal-user INSERT/UPDATE/DELETE; no loss of admin SELECT; and any views or RPCs that bypass the intended policy.

Also verify scholarship landing page, Global Search Beta, general `opportunities` listing, opportunity details, saved items, review workflow, search count, 401/403 behavior, indexes, and fallback/error UX on mobile. Evaluate SQL role grants independently of row filters. Automated tests should assert **visibility and invisibility**, not simply that a query returns 200 OK.

## 5. Distinct follow-up: atomic publication and audit

A SQL SELECT policy is not the whole publication system. Plan a **separate**, limited-scope staging-reviewed change to guarantee server-authorized transition to `active/verified/published` and durable audit logging in one transaction. Do not introduce an unrestricted privileged `SECURITY DEFINER` RPC or assume a successful frontend operation proves an audit row was written. Validate role grants, protected search path, audit failure rollback, and ordinary-user denied access.

## 6. Implementation gates and controls

| Gate | Acceptance evidence | State |
| --- | --- | --- |
| A: Inventory | Live RLS / table grants / counts / status combinations | COMPLETE — read-only 2026-10-24 snapshot |
| B: Isolation | Staging database is provably distinct and production credentials not shared | PARTIAL — separate Lovable project and different count, binding not proven |
| C: Restore | Pre-migration backup, restore test and reversal workflow documented | NOT VERIFIED |
| D: SQL tests | Syntax and policy tests with synthetic fixtures run in isolated staging | NOT RUN |
| E: Regression | Public + admin UI/API tests pass, count changes approved | NOT RUN |
| F: Release | Founder explicitly approves reviewed migration with deployment window and rollback | NOT AUTHORIZED |
| G: Verification | Live read-only policies, grants and role visibility rechecked after deployment | NOT APPLICABLE YET |

**Rollback design** (requires separate approval): preserve the exact original policy definition and a reviewed migration to revert if the new policy unexpectedly blocks legitimate access. Do **not** revert to an unsafe policy automatically in response to an incident. Instead pause release, investigate, and use an approved fallback. Backup/restore requirements are independent of simply undoing DDL.

**Deployment boundary:** No SQL has been executed here. No RLS, auth, user account, table row, university data, Vercel production deployment or Lovable agent was modified. This PR only creates documentation under `docs/security/`.

## 7. Recommended next action

1. Maintain **Lovable Cloud** as the current ICK Opportunities production backend, per Founder Option A.
2. Confirm staging-bound environment variables, database project refs, isolation and synthetic test accounts.
3. Test the policy draft and RLS role matrix in isolated staging *only when a separate, explicit approval authorizes staging writes*.
4. After evidence passes, prepare an actual migration and ask the Founder for **separate production approval**.
5. Keep University Registry schema and scholarship-cycle work separate until this P1 issue is addressed.

**Bottom line:** Policy gap VERIFIED in the live Lovable database; **no active publicly eligible rows** in the observed aggregate snapshot; **remediation prepared but NOT implemented**.