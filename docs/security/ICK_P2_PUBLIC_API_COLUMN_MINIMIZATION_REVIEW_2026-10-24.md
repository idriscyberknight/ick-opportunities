# ICK Opportunities — P2 Public API Column Minimization Review

**Date:** 2026-10-24  
**Status:** REVIEW ONLY / NO CODE OR DATABASE FIX APPLIED  
**Base:** `main` @ `72b596fea8c807b4c0b84d5738b46825c4071e0c`  
**Separate P1:** `docs/security/ICK_P1_PUBLIC_OPPORTUNITY_RLS_REMEDIATION_PLAN_2026-10-24.md` on PR #20, still a distinct security track.

> **Founder decision:** Keep current production database on Lovable Cloud (Option A). This is a P2 **design and code-level evidence** document, not authorization to revoke SQL grants, install views/functions, migrate schemas or deploy to production. Do not merge this review without explicit authorization.

## 1. Verified source-level exposure inventory

| Surface (GitHub `main`) | Code-level finding | Assessment |
| --- | --- | --- |
| `src/lib/opportunities.ts` → `fetchPublicOpportunities()` | Supabase `.from("opportunities").select("*")`, called by `src/components/OpportunityBrowser.tsx` and `RecommendedOpportunities.tsx` | **P2:** public-listing HTTP responses may contain columns unused by those screens whenever rows pass RLS. |
| `src/lib/opportunities.ts` → `fetchOpportunityById()` | Supabase `.select("*")`, used by `src/routes/opportunities.$id.tsx` | **P2:** raw full-row details may include reviewer IDs and provenance that the details page does not display. |
| `src/lib/saved.ts` → `fetchSavedOpportunities()` | Nested `.select("opportunity_id, created_at, opportunities(*)")` in a signed-in saved-list feature | **P2:** indirect full opportunity rows need auditing; nested relationships obey grants/RLS but do not enforce column minimization. |
| `src/lib/tracking.ts` | A second joined `opportunities(*)` pattern found in code search | **P2:** audit the tracker flow and contract before changing nested queries. |
| `src/lib/matching.ts` | Ranking expects an `Opportunity` type imported from `src/lib/opportunities.ts` and accesses title, description, eligibility, benefits, organization, category, country, state, status and deadline | **Compatibility risk:** a client-side change to a partial projection requires a deliberate `PublicOpportunity` type; otherwise TypeScript or recommendations may break. |
| `src/routes/sitemap[.]xml.ts` | Already uses a narrow `.select("id, updated_at")` | **GOOD:** keep its public index behavior in regression scope; narrow query is not an RLS authorization control. |
| `src/lib/review.ts` and `src/lib/opportunities.ts` admin function | Admin functionality uses full-row data for legitimate administrative workflows | **IMPORTANT:** do not apply public field restrictions to these privileged screens without redesigning admin access. |

### Type-driven evidence

`src/integrations/supabase/types.ts` lists potentially internal `opportunities` columns such as:
- `created_by` and `reviewed_by` (account-linked identifiers, not for automatic public disclosure),
- `reviewed_at`, `discovered_at`, `source_id`,
- `relevance_score`, `nigeria_score`, `africa_score`, `remote_score` and `global_score`,
- operational fields such as `created_at`, `updated_at`, `status` and `verified_status`.

**Interpretation:** This is **verified overbroad retrieval design**. It is **NOT evidence of an actual production data disclosure**. The last inspected production snapshot had zero active opportunities matching the public SELECT predicate. A full live network/API response audit was not conducted for this P2 review.

## 2. Public data contract — proposal, not yet approved

A preliminary least-privilege contract for the public listing and detail screen:

| Field | Proposed public? | Rationale |
| --- | --- | --- |
| `id`, `title`, `category`, `organization` | YES | Listing identity and browse navigation. |
| `description`, `eligibility`, `benefits` | YES | Browse details and recommendation text. |
| `country`, `state`, `deadline` | YES | Filters, location and expiration. |
| `official_link` | YES, after verified editorial publication | Official application link. |
| `verified_status` | YES, as controlled public badge state | Existing UI and share flow displays whether reviewed. |
| `status` | CONDITIONAL | Ranking code currently consumes it, but backend RLS should guarantee only public statuses; eliminate from public response only after compatible refactor. |
| `updated_at` | Conditional for sitemap only | Current sitemap uses narrow query. |
| `created_by`, `reviewed_by` | NO | Internal user IDs; do not expose by default. |
| `source_id`, `discovered_at`, `reviewed_at` | NO by default | Editorial/audit metadata; may be used privately for traceability. |
| All internal scores | NO by default | Derived relevance scoring and internal analytics. |

**Scope note:** The table is a draft. Validate each column's legitimate public need and privacy classification before implementing. Some source fields may later have public editorial uses, but that is an explicit product decision.

## 3. Critical distinction: client projection is not access control

Changing `.select("*")` to `.select("id,title,...")` is useful **data minimization in the standard UI response**. But a user who can call PostgREST directly may still request `created_by` or `reviewed_by` if the database role retains adequate table-level or column-level `SELECT` privileges.

**P1 RLS** restricts **which rows** are accessible; **P2 least-privilege** must separately restrict **which columns** an external client can read. Simply changing client query text **cannot be marked a complete security fix**.

Special Supabase/Postgres authorization consideration: `anon` and `authenticated` are shared database roles; a legitimate admin JWT often carries the same PostgreSQL role as an ordinary signed-in user. Column-level `GRANT` for `authenticated` does **not** automatically distinguish admin users from normal users. Likewise, a view created with default definer privileges can accidentally bypass base RLS. A truly authoritative public data boundary might require **a dedicated public API/view with safe invoker semantics and carefully planned table privileges, together with a separate server-authorized admin data path**, depending on how current Lovable Cloud and Supabase Data API routes are configured. This must be tested in isolation before any grants are revoked.

Do not create an unrestricted `SECURITY DEFINER` function to bypass authorization errors, expose service-role keys, or copy production personal data to staging.

## 4. Safe implementation plan — independent of PR #20

### P2-A: complete route and data contract audit (NO database changes)
- Read the full saved-list and tracking page queries, profile/recommendation, share links, public listing, detail view and SEO sitemap.
- Document all fields actually required by each consumer; ensure UI code, type signatures and tests use a dedicated `PublicOpportunity`/public projection contract distinct from administrative `Opportunity`.
- Define explicit field lists for standard public client queries. Treat this as an **incremental frontend bandwidth/privacy improvement**, not server-enforced authorization.

### P2-B: server-enforced data boundary (STAGING ONLY, separate approval)
- Inspect live `GRANT`, `pg_policies`, view definitions, RPC `EXECUTE` grants and exposed API schema. Confirm **column-level visibility with real anon and signed-in JWT requests**, not a privileged SQL console connection.
- Choose between authorized base table column grants, a secure public projection/API route, or a design that safely separates public and administrative access. Preserve current admin review/update workflows.
- Confirm policy changes cannot leak unpublished rows due to permissive policy composition, views, joins or `security definer` functions.

### P2-C: regression and release gates
- Anonymous: only approved rows and public fields; guessed unpublished IDs return no record.
- Normal authenticated: no additional internal fields or author/reviewer IDs, except deliberately permitted.
- Admin: all necessary review/audit data available through authorized path only.
- Saved and tracker joins: no hidden record/column leakage, correct links and ordering.
- Recommendation scoring, public search, detail, share text and SEO sitemap continue to work.
- No misconfigured Vercel preview / staging environment binding; separate backup and rollback readiness.
- Require explicitly approved production rollout **after** P1 has been safely tested and deployed.

## 5. Release decision

**Current classification: P2 potential privacy/overfetch risk from verified code patterns, NO confirmed public leak.** No database changes, server-enforced column restrictions, application-code edits, migrations, Lovable-agent messages or deployments are part of this PR.

**Next step:** implement a small frontend-only public DTO/projection change in a **separate reviewable code PR**, run typecheck/build and UI regression, then separately plan and test an authoritative server-side column exposure boundary. **Do not merge without the Founder's explicit approval.**
