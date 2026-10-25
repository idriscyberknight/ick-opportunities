# ICK Opportunities — A1.4 Backend Architecture & Data Verification Readiness Review

**Document type:** Evidence-based architecture reconciliation / read-only security assessment  
**Date:** 2026-10-24  
**Status:** DRAFT — NOT AN IMPLEMENTATION OR A PRODUCTION SECURITY CERTIFICATE; updated after read-only Lovable Cloud inspection  
**Reference production code:** `main` commit `72b596fea8c807b4c0b84d5738b46825c4071e0c` (merged PR #18)  
**Scope:** Global Universities & Scholarship Navigator. Preserve existing opportunities, authentication, administration, recommendations and user information.

> This document is NON-EXECUTABLE. Do not paste the proposed design into a production SQL editor or merge a schema file to `supabase/migrations` on its authority. No live database data, schema, RLS policy, environment variable, API key, payment setting or deployment is changed here.

## Founder decision — 2026-10-24

**APPROVED strategic Option A:** Keep the existing **Lovable Cloud database** running as the ICK Opportunities backend now; **plan** a possible future migration to an ICK-controlled Supabase project only after business need, export/import support, user/auth/session strategy, backup/rollback, isolated staging, security and cost have been separately reviewed. **This approval does not authorize migration, DDL, publication-policy changes, credential changes or production deployment.**

### Updated live read-only evidence via Lovable connection (no writes)

- Confirmed linked Lovable project **ICK-Opportunities** (`433a53c8-8872-49f2-b7b8-3e8dc7e96e35`) reports `database.enabled=true`, `stack=supabase`. This is the project's **Lovable Cloud database**, not the unrelated standalone Supabase project.
- `information_schema.tables` on this Lovable Cloud database lists `opportunities`, `opportunity_sources`, and `opportunity_audit_logs`; none of the four university-registry tables appeared in this scoped table-name query.
- Actual `pg_policies` SELECT rule for **Public can view live opportunities** is `status='active' AND (deadline IS NULL OR deadline >= CURRENT_DATE)` for `anon` and `authenticated` — **confirmed in live database metadata**, not just checked-in SQL.
- Read-only aggregate query returned **14 total opportunity rows, 0 rows satisfying the public active/deadline policy, and 0 candidates under the additional unverified/unpublished condition** at the inspection moment. This does **not** prove there have never been exposed rows, or rule out later issues.
- Remaining unknowns: direct anonymous REST checks, policy change/backfill regression impact, backups, restoration tests, isolated staging and full auth role-matrix. These checks must precede any policy alteration.

## 1. Executive findings (with confidence)

| ID | Finding | Evidence / confidence | Implication |
| --- | --- | --- | --- |
| A14-F01 | University directory currently uses exactly **8 static editorial records**, not database-backed university data | **VERIFIED in repository**: `src/lib/university-directory.ts` | World-wide searchable university registry is **not implemented**. |
| A14-F02 | The checked-in 14 `supabase/migrations/*.sql` files do **not** create university-registry tables; the scoped live metadata query also did not list the four registry tables | **VERIFIED in repository and via Lovable Cloud read-only table-name query** | No registry tables observed; the eight institutions remain static for the current public interface. |
| A14-F03 | A detailed four-table registry architecture and draft SQL already exist | **VERIFIED in repository**: `docs/architecture/ICK_GLOBAL_UNIVERSITY_REGISTRY_V1.md`, `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql` | **Reuse and reconcile** them; do not create duplicate competing schema designs. |
| A14-F04 | The draft schema is intentionally **fail-closed**: no public university reads and a CHECK blocking `published` state | **VERIFIED by reading draft SQL**, **NOT TESTED against PostgreSQL** | Staging test first; it cannot power public directory search merely by being applied. |
| A14-F05 | The deployed opportunity public SELECT RLS predicate requires active status and an acceptable deadline but **does not require** `verified_status='verified'` or non-null `published_at` | **VERIFIED in repo AND in live Lovable Cloud `pg_policies` metadata** | **P1 permission weakness**, even though snapshot aggregate query showed **0 currently qualifying public rows**. Distinct security remediation track. |
| A14-F06 | `fetchPublicOpportunities()` and `fetchOpportunityById()` use `select("*")` and trust RLS for public rows | **VERIFIED in repository**: `src/lib/opportunities.ts` | Frontend filters cannot repair permissive database authorization. |
| A14-F07 | `reviewOpportunity()` updates an opportunity then inserts an audit log in a separate request, without checking the audit insert error | **VERIFIED in repository**: `src/lib/review.ts` | A review action can succeed while its audit record fails; transactional review/publish operation requires design. |
| A14-F08 | The standalone Supabase connector lists an unrelated `ICk technologies` project (`ojnibatohrnzikiswuuw`), but the Lovable plugin independently reached the project's **Lovable Cloud database**; repository config names `xzxfodukvzzfwbwokhxt` | **VERIFIED Lovable project status and database metadata; standalone project remains unrelated** | Continue safe inspections through **Lovable read-only tools**, not the unrelated standalone project; migration target and staging isolation still require separate validation. |
| A14-F09 | 2026-10-24 read-only aggregate count found 14 total opportunities, none qualifying for public visibility at inspection time | **VERIFIED in Lovable Cloud database snapshot**, subject to the query's role/permissions | No currently visible qualifying rows found in this query; **not** proof that the public RLS predicate is secure. |

**Assessment:** The actual **Lovable Cloud database is now reachable for read-only checks**; the current backend must **remain on Lovable Cloud per Founder decision A**. A1.4 implementation remains blocked by absence of verified isolated staging, a reviewed publication RLS correction, role-level tests and restore/rollback evidence.

## 2. Reconcile with existing plans — no duplicate architecture

The following checked-in documents are pre-existing **design artifacts, not proof of an active system**:

1. `docs/architecture/ICK_GLOBAL_UNIVERSITY_REGISTRY_V1.md` — four-table first phase and RLS governance.
2. `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql` — intentionally closed-to-public schema draft; **not in `supabase/migrations`**.
3. `docs/database/SECURITY_AND_STAGING_TEST_PLAN.md` — independent staging, persona tests and backup gates.
4. `docs/architecture/ICK_GLOBAL_SEARCH_INTEGRATION_CONTRACT_V1.md` — separated university and scholarship result types.
5. `docs/architecture/ICK_GLOBAL_SCHOLARSHIP_SEARCH_FOUNDATION_V1.md` — longer-term scheme, cycle, eligibility and evidence entities.

**Recommended architecture decision (proposed, pending Founder approval):** preserve the first-stage four-table design, subject to qualified staging SQL review:

- `universities`: stable identity, draft/publication lifecycle, optional institutional site (not an open-scholarship claim).
- `university_aliases`: Arabic/English/French names and institution-specific abbreviations.
- `university_evidence`: individual supported claims, independent source and reviewer metadata; separate website-operator verification from general institution identity.
- `university_classifications`: evidence-linked institutional categories, never derived merely from a country's majority religion.

**Later only:** `academic_programmes`, `scholarship_programmes`, `scholarship_cycles`, eligibility claims, funding-source evidence, and many-to-many institution–funding relationships. Existing `opportunities` must **not** be copied into a second uncontrolled scholarship table. Choose whether to link a source opportunity by stable FK or a reviewed mapping table after initial schema and publication safety are proven.

A university's identity, the legitimacy/ownership of a website, academic accreditation, scholarship scheme eligibility, and an **open application cycle** are **different assertions**. Their verification status, proof and timestamps must not share one misleading "Verified" badge.

## 3. Priority P1: existing public opportunity visibility predicate

In `supabase/migrations/20260904011034_0bbc687a-4920-445e-b959-b0a6f9b30207.sql`, the current checked-in policy states:

```sql
USING (status = 'active' AND (deadline IS NULL OR deadline >= CURRENT_DATE))
```

This predicate is **not** restricted to `verified_status = 'verified'` or `published_at IS NOT NULL`. **Read-only `pg_policies` inspection of the actual Lovable Cloud database on 2026-10-24 confirmed the same predicate.** Client functions under `src/lib/opportunities.ts` rely on database RLS. Some specialised scholarship queries apply additional frontend filters, but those cannot stop direct Data API requests to a permissive table policy. The inspected database had **0 rows qualifying for public visibility** at the time of the aggregate query.

**Potential impact:** a row that is marked `active` without being approved/published could become publicly readable if the deployed policy matches the checked-in one. This finding **does not assert that such rows currently exist or were accessed**.

**Required independent security track — NOT implemented by this document:**

1. **Completed:** verified the deployed public SELECT predicate via Lovable Cloud `pg_policies` read-only metadata. Recheck immediately before any eventual remediation.
2. **Initial snapshot completed:** 14 total rows, 0 matching old public predicate and 0 in the inspected potential-exposure subset. Repeat aggregates before remediation and examine historical review/audit consistency without exposing sensitive row values.
3. Define publication invariants: `status='active'`, `verified_status='verified'`, non-null `published_at` not in the future, valid deadline, evidence and admin authorization.
4. Design a **separate** reviewed policy-and-publication change with regression tests. A tight policy applied without a legacy-data impact review can unexpectedly hide approved listings.
5. Validate direct REST/API access using anonymous and signed-in identities, not merely UI testing.

**Severity (provisional): P1 / high priority investigation.** Treat the rule as an actual code-level weakness; confirm runtime exposure independently.

## 4. Audit logging / transaction concern

`src/lib/review.ts` applies an UPDATE to `opportunities`, then calls `opportunity_audit_logs.insert(...)` without handling the audit result. These statements are not one database transaction from the browser's point of view.

**Proposed correction after staging review:** move the review/publish decision into a narrowly authorized transactional server-side workflow or database function, requiring a server-enforced admin check, consistent `reviewed_by` / `reviewed_at` / `published_at` and durable audit insert. Avoid an unrestricted `SECURITY DEFINER` public RPC; if privileged code is necessary, use a minimal private schema, explicit EXECUTE grants, locked-down search path and independent tests. Do **not** add this to the university-registry schema PR by default.

## 5. Read-only discovery SQL — for the CORRECT connected database only

The queries below do not create tables or alter data. **Do not run them on the unrelated connected Supabase project.** Run only after independently confirming the production/staging mapping and authorization.

**A. Table inventory**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'opportunities', 'opportunity_sources', 'opportunity_audit_logs',
    'universities', 'university_aliases', 'university_evidence',
    'university_classifications', 'scholarship_programmes', 'scholarship_cycles'
  )
ORDER BY table_name;
```

**B. Public-facing opportunity RLS**

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'opportunities'
ORDER BY policyname;
```

**C. Read-only aggregate exposure *candidates* (requires authorized access)**

```sql
SELECT
  count(*) FILTER (
    WHERE status = 'active'
      AND (deadline IS NULL OR deadline >= CURRENT_DATE)
  ) AS eligible_by_old_public_predicate,
  count(*) FILTER (
    WHERE status = 'active'
      AND (deadline IS NULL OR deadline >= CURRENT_DATE)
      AND (verified_status <> 'verified'
        OR published_at IS NULL OR published_at > now())
  ) AS candidates_requiring_review,
  count(*) FILTER (
    WHERE status = 'active'
      AND verified_status = 'verified'
      AND (published_at IS NULL OR published_at > now())
  ) AS legacy_approval_timestamp_gaps
FROM public.opportunities;
```

**D. RLS enabled flags on prospective registry tables, if present**

```sql
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'universities', 'university_aliases',
    'university_evidence', 'university_classifications'
  )
ORDER BY c.relname;
```

Zero candidate count under query C does **not** prove the policy is safe; verify role-level access and SQL policy text. Do not transmit record-level personally identifying information.

## 6. Staged implementation gates

| Gate | Required result | Current status (2026-10-24) |
| --- | --- | --- |
| G0. Architecture reconciliation | Reuse existing four-table design, record risks and changes needed | **THIS DOCUMENT, DRAFT** |
| G1. Environment identity | Confirm Lovable Cloud project, DB enablement and controlled read-only access; verify deployment-binding before any future migration | **PARTIAL — LOVABLE DB REACHED, DEPLOYMENT BINDING NOT FULLY PROVEN** |
| G2. Isolated database | Separate staging/local Supabase with safe seed data, backups, rollback and no production user-data copying | **NOT VERIFIED** |
| G3. Existing RLS security | Deployed policy and initial aggregate count inspected; next perform direct anonymous REST and role tests, impact analysis and separate reviewed remediation | **P1 VERIFIED IN LIVE POLICY; NO WRITES; MORE TESTING REQUIRED** |
| G4. Staging SQL | Run existing four-table schema draft in **isolated** Postgres/Supabase; validate DDL, indexes, same-university evidence FK, grants, RLS and no publication | **NOT EXECUTED** |
| G5. Role-matrix tests | `anon`, normal signed-in user, admin and service role: no accidental access, no drafts leaking, no unauthorized writes | **NOT EXECUTED** |
| G6. Approved seed ingestion | Transfer **only** the eight starter institutions as drafts; check aliases, website provenance and dedup; no blanket verification | **NOT EXECUTED** |
| G7. Reviewed public API | Add explicit public-read policy only after transactionally enforced verification+publication; indexed pagination; caching and slow network tests | **FUTURE** |
| G8. Founder-approved release | Code review, security, QA, accessibility, backup recovery and explicit production migration approval | **FUTURE** |

### Staging persona matrix for the existing draft

| Persona | University draft read | Insert/update | Publish |
| --- | --- | --- | --- |
| anonymous | Denied | Denied | Denied |
| signed-in ordinary | Denied | Denied | Denied |
| admin | Allowed with narrow RLS + GRANT | Draft edits only | Denied by CHECK in this phase |
| trusted server role | Allowed as needed | Allowed in isolated deployment | Denied by fail-closed CHECK |

**Important:** A GitHub branch and a Vercel Preview do **not** automatically mean a separate database exists. Test actual effective roles, not only simulated frontend states.

## 7. Practical data standards

- Do not present a website domain as institution-operated until provenance has been independently confirmed; the Islamic University in Niger remains **website verification pending**.
- Preserve historical source verification events rather than overwriting them. An editorial `sourceCheckedOn` field is not independent proof of current accreditation, eligibility or open applications.
- Separate `institution_id`, `funding_programme_id`, and `application_cycle_id` when later designing scholarship cycles.
- When capturing a future cycle, require the **year or round**, authoritative source URL, checked time, official application URL ownership, coverage, nationality/degree rules and deadline *if established*. Unknown is a valid state.
- Enforce unique institution slugs, deduplicate aliases with human review, retain script/language metadata, and distinguish multi-provider funding from institution-hosted funding.
- Search should start with indexed Postgres and server-side pagination, not expensive embeddings or broad uncontrolled web scraping.
- Public RLS must check backend publication rules independently of cards, `select("*")` filters or client-side status labels.
- No secrets or service-role credentials in browser code. Avoid storing uploaded student documents in institution-evidence records.

## 8. Decisions and exact next safe actions

**Recommendation for Founder approval:** Option A — adopt the **existing four-table fail-closed university-registry draft** for controlled staging testing, and **separately prioritize** opportunity publication-policy verification. Option B — adding scholarship-cycle tables at once — is premature before stage-one evidence safety is established.

**Next authorized read-only actions:** continue through the **connected Lovable Cloud database**, confirm preview/production database binding and separately verify whether an isolated staging database truly exists. Read only remaining role/grant/policy metadata; perform a static SQL review and plan the independent P1 publication-policy remediation. **Do not execute migrations, change policy or release a public API without explicit authorization.**

**Not done / not claimed:** the ICK Opportunities Lovable Cloud database was queried **read-only** for schema, policies and aggregate counts; **no SQL writes**; no university tables created; no source seeding; no publication, deployment or migration; no live breach finding; no security certificate.

### Reference materials already in repository

- `supabase/migrations/20260904011034_0bbc687a-4920-445e-b959-b0a6f9b30207.sql` — original public opportunity SELECT policy and admin role.
- `supabase/migrations/20261001145456_95e87d5f-22f6-4887-9a74-59933b33fa55.sql` — source and audit fields.
- `supabase/migrations/20261008100000_c5_tighten_database_privileges.sql` — grants and revokes, **no change to public SELECT predicate**.
- `src/lib/opportunities.ts` — public select queries; `src/lib/review.ts` — separate update/audit sequence.
- `src/lib/university-directory.ts` — eight static starter institutions.
- `docs/architecture/ICK_GLOBAL_UNIVERSITY_REGISTRY_V1.md` and `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql` — first-stage registry plan.
- `docs/database/SECURITY_AND_STAGING_TEST_PLAN.md` — role testing and environmental prerequisites.
- Supabase RLS documentation: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API security guidance: https://supabase.com/docs/guides/api/securing-your-api

**Principle:** Evidence before "verified"; verified institution ≠ open scholarship; stage before production; Founder approval before deployment.
