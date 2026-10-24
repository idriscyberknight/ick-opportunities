# ICK Opportunities — A1.4 Backend Architecture & Data Verification Readiness Review

**Document type:** Evidence-based architecture reconciliation / read-only security assessment  
**Date:** 2026-10-24  
**Status:** DRAFT — NOT AN IMPLEMENTATION OR A PRODUCTION SECURITY CERTIFICATE  
**Reference production code:** `main` commit `72b596fea8c807b4c0b84d5738b46825c4071e0c` (merged PR #18)  
**Scope:** Global Universities & Scholarship Navigator. Preserve existing opportunities, authentication, administration, recommendations and user information.

> This document is NON-EXECUTABLE. Do not paste the proposed design into a production SQL editor or merge a schema file to `supabase/migrations` on its authority. No live database data, schema, RLS policy, environment variable, API key, payment setting or deployment is changed here.

## 1. Executive findings (with confidence)

| ID | Finding | Evidence / confidence | Implication |
| --- | --- | --- | --- |
| A14-F01 | University directory currently uses exactly **8 static editorial records**, not database-backed university data | **VERIFIED in repository**: `src/lib/university-directory.ts` | World-wide searchable university registry is **not implemented**. |
| A14-F02 | The checked-in 14 `supabase/migrations/*.sql` files do **not** create university-registry tables | **VERIFIED in checked-in migration history only** | Cannot infer current live database inventory; historical untracked SQL is possible. |
| A14-F03 | A detailed four-table registry architecture and draft SQL already exist | **VERIFIED in repository**: `docs/architecture/ICK_GLOBAL_UNIVERSITY_REGISTRY_V1.md`, `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql` | **Reuse and reconcile** them; do not create duplicate competing schema designs. |
| A14-F04 | The draft schema is intentionally **fail-closed**: no public university reads and a CHECK blocking `published` state | **VERIFIED by reading draft SQL**, **NOT TESTED against PostgreSQL** | Staging test first; it cannot power public directory search merely by being applied. |
| A14-F05 | The checked-in opportunity public SELECT RLS predicate requires active status and an acceptable deadline but **does not require** `verified_status='verified'` or non-null `published_at` | **VERIFIED in migration source code**, current live RLS **NOT RE-VERIFIED** | **P1 potential unintended visibility** if records are active yet unreviewed/unpublished. Distinct security remediation track. |
| A14-F06 | `fetchPublicOpportunities()` and `fetchOpportunityById()` use `select("*")` and trust RLS for public rows | **VERIFIED in repository**: `src/lib/opportunities.ts` | Frontend filters cannot repair permissive database authorization. |
| A14-F07 | `reviewOpportunity()` updates an opportunity then inserts an audit log in a separate request, without checking the audit insert error | **VERIFIED in repository**: `src/lib/review.ts` | A review action can succeed while its audit record fails; transactional review/publish operation requires design. |
| A14-F08 | The only Supabase project currently visible to this ChatGPT Supabase connection is an **unrelated** project named `ICk technologies` (`ojnibatohrnzikiswuuw`); `supabase/config.toml` identifies `xzxfodukvzzfwbwokhxt` | **VERIFIED connection inventory and repository config**, not proof of live deployment binding | **DO NOT QUERY OR MIGRATE THE UNRELATED PROJECT.** Connect and independently verify the actual production/staging environment. |
| A14-F09 | A repository document dated 2026-10-23 reports prior read-only schema probes | **HISTORICAL DOCUMENT CLAIM**, not reproduced through today's connection | Keep historical results, but re-run live read-only checks against the correct database before authorizing implementation. |

**Assessment:** A1.4 architecture groundwork exists and should be reused. **Backend implementation readiness is blocked by unverified authoritative database access, isolated staging, and a publication RLS risk.**

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

This predicate is **not** restricted to `verified_status = 'verified'` or `published_at IS NOT NULL`. Client functions under `src/lib/opportunities.ts` rely on database RLS. Some specialised scholarship queries apply additional frontend filters, but those cannot stop direct Data API requests to a permissive table policy.

**Potential impact:** a row that is marked `active` without being approved/published could become publicly readable if the deployed policy matches the checked-in one. This finding **does not assert that such rows currently exist or were accessed**.

**Required independent security track — NOT implemented by this document:**

1. Verify the deployed policy text on the **correct** project; do not treat repo migrations as authoritative live state.
2. Audit counts (only counts, no sensitive row values) of active, unverified and unpublished opportunities, and existing published records with null timestamps.
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
| G1. Environment identity | Verify deployed frontend binds to the intended Supabase project; confirm current project ID and change authority | **BLOCKED — NOT VERIFIED** |
| G2. Isolated database | Separate staging/local Supabase with safe seed data, backups, rollback and no production user-data copying | **NOT VERIFIED** |
| G3. Existing RLS security | Independently inspect current policy, active/unreviewed row counts, direct API visibility and remediate in separate reviewed change | **REQUIRES TESTING** |
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

**Next authorized read-only actions:** connect the correct ICK Opportunities production/staging Supabase project (not the unrelated `ICk technologies` project); confirm deployment binding and list only table metadata, policies, and aggregate exposure counts. Then perform a static SQL review and create a staged testing plan for the existing draft. **Do not execute any migration or release a public API without explicit authorization.**

**Not done / not claimed:** no Supabase SQL execution against ICK Opportunities; no new university tables; no source seeding; no publication; no deployment; no live breach finding; no security certificate.

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
