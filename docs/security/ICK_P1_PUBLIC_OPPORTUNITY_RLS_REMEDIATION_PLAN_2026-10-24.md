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

The two projects have **different Lovable IDs and different repository Supabase project refs**; their recorded opportunity counts were also different. This is **strong evidence of distinct configured projects**, but **not full verification of live runtime environment variable binding, background-job isolation, database connections or backups**. Both client files rely on `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` environment values rather than hardcoded refs. Do **not** treat a repository ref alone as definitive proof of deployed connection binding.

### Tooling blocker — no changes made

During the follow-up, the Lovable Cloud MCP query tool returned **free-plan database action limit reached** before any new identity, policy, or runtime-isolation queries could execute. The provider confirmed **those queries were not executed**. No SQL writes, test fixtures, `ALTER POLICY`, migrations, or changes to either database were attempted. The staging RLS persona matrix remains **NOT TESTED**.

**Consequence:** Do not proceed with staging data writes or DDL until environment isolation is independently confirmed and database action access is available. Do not purchase an upgrade merely for this check; an approved free/local test environment is an alternative after prerequisites and tooling are verified.

### Next safe checks when access is available

1. In **read-only mode**, confirm actual database connection identities and server-side environment bindings for both Lovable projects without revealing credentials.
2. Confirm the staging project cannot access production auth, database or storage with its client credentials.
3. Establish an isolated, synthetic-data-only staging test fixture and reviewed restoration strategy.
4. Exercise `anon`, signed-in ordinary-user and admin role access against the proposed RLS; record negative and positive tests and ensure no production data is touched.
5. Require Founder review again before any permanent staging schema modification or production rollout. A successful Vercel build is not evidence that RLS passes.

## 2. Existing application behavior and limitations

- The general public page read functions `fetchPublicOpportunities()` and `fetchOpportunityById()` in `src/lib/opportunities.ts` use Supabase queries whose effective public visibility depends on database RLS.
- `src/routes/scholarship-navigator_.global-search.tsx` filters scholarships by `active`, `verified` and non-null `published_at` client-side. This is defense-in-depth but cannot secure the unfiltered data API.
- The review function in `src/lib/review.ts` updates an opportunity and then inserts an audit log in a **second request**, without checking the audit insertion error. Publication and audit are not currently guaranteed atomic.
- Existing PR #19 documents architectural work; **this PR is the distinct P1 policy remediation design** and must not be mistaken for completion of that architecture review.

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