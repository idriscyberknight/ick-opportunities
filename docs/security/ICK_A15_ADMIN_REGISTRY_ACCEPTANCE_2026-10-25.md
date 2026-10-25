# ICK Opportunities — A1.5 Admin University Registry acceptance plan

## Latest signed-session test addendum — 2026-10-25

This addendum supersedes **only** outdated `Pending` labels in the early planning matrix below; those entries describe the initial test plan, not current test execution.

| Actual test | Evidence | Outcome |
|---|---|---|
| Existing Admin opens responsive Registry UI, sees empty drafts, follows Review Queue navigation | Founder mobile screenshots | PASS — UI rendering/navigation |
| Existing non-admin/normal-user browser denied Admin UI | Founder screenshot + intended ordinary-user sign-in | UI DENIAL observed; session identity independently confirmed by separate JWT test |
| `auth.getUser()` real normal-user session and role lookup | Founder mobile screenshots | PASS — validated YES, NORMAL USER |
| Four normal-user PostgREST read-only `HEAD` requests | Founder mobile screenshots | REVIEW — 4x HTTP 200/0 records, row-level isolation on nonempty datasets not proven |
| `auth.getUser()` real Admin session and role lookup | Founder mobile screenshots | PASS — validated YES, ADMIN |
| Four Admin PostgREST read-only `HEAD` requests | Founder mobile screenshots | PASS — 4x HTTP 200, endpoint reachability only |
| Real-JWT non-admin POST/PATCH write denial | Not run | PENDING, not inferred from SQL-role simulation |
| Cross-user/cross-role read isolation with known fixtures | No university records exist | PENDING, not inferred from empty-table response |
| Transaction-only SQL-role Admin write/normal-user denial | Prior role simulation, transaction rolled back and independently read back | PASS for simulation only |
| Temporary browser JWT test route | Removed on Draft PR #22 after screenshots | COMPLETE — not included in proposed production code |
| Vite build, strict TypeScript & A1.5 scoped ESLint | Prior PR CI | PASS before removal; re-run required after cleanup |
| Full repository ESLint | Known legacy baseline failures | NOT PASS; reported without turning whole CI red |

**Release blockers updated:** Migration ledger/source reconciliation (13 live ledger entries, direct A1.4 SQL schema not represented as a newly dated migration), replacement/review of interim schema-verified typed bridge when correct Lovable-generated types are available, independent real-JWT write/isolation checks or explicitly documented test scope decisions, source verification/editorial approval workflow, and separate Founder merge/release approval. No production app merge, schema mutation, data import or publish was authorized by the screenshots.

---

Date: 2026-10-25 · Status: DRAFT / NOT RELEASE APPROVAL

## Scope and environments
- Production DB is **already** provisioned (the four `public.universit*` tables, 12 RLS policies, no publication).
- GitHub Draft PR #22 adds an admin-only editorial UI and client integration. A successful Vercel status does **not** establish TypeScript correctness, live role authorization, or browser UX.
- This PR must **not** be merged, published to the production branch, or used to publish universities until the checks below are verified. Existing public starter entries are editorial/static and remain unchanged.

## Independent database rollback readback — VERIFIED
2026-10-25: read-only connected Production query returned universities=0, aliases=0, evidence=0, classifications=0; auth.users=10, roles=1, opportunities=14, registry policies=12. This independently establishes previous synthetic SQL-role fixture rollback.

## Current verified tests
1. SQL-role transaction-only: existing admin can INSERT and UPDATE draft data and attach same-institution evidence/alias/classification: PASS (rolled back).
2. SQL-role transaction-only: distinct normal user sees no confidential drafts; unauthorized INSERT denied: PASS (rolled back).
3. Read-only Production DB: all temporary test rows removed after rollback: PASS.
4. GitHub PR #22 branch has Vercel commit status **success**, but no independently verified `tsc --noEmit`, lint suite or real JWT HTTP request matrix.
5. New route is `/_authenticated/admin.universities.tsx` mapping to `/admin/universities`. It is intended to be reachable from existing Admin Review navigation. This route is **NOT live on production** until a distinct approved merge/release.

## Manual browser acceptance matrix — NOT YET EXECUTED
Use only a **review-approved Vercel preview** in an authorized browser; never submit credentials to another person or ChatGPT.

| Scenario | Expected result | Evidence |
|---|---|---|
| Anonymous visit `/admin/universities` | Redirect to sign-in; no private data | Pending |
| Signed-in ordinary user (onboarded) | "Administrator access required"; no registry records | Pending |
| Existing authorized admin (onboarded) | Admin page loads, four table queries complete, zero draft records | Pending |
| Admin creates one **test draft** | Pending-review draft is created ONLY if Founder has separately authorized controlled write test; never automatically published | Not approved; pending |
| Admin adds alias and unreviewed evidence | Both linked to the correct draft, audit source fields not fabricated | Pending |
| Admin provisional classification with evidence from another institution | Database rejects cross-institution FK | Pending |
| Ordinary user direct GET/POST/PATCH to registry API with signed JWT | No private drafts exposed and writes denied | Pending |
| Public university directory/global search | Existing eight editorial starter entries unchanged | Pending |
| Review/publish buttons | Not present; backend CHECK rejects publication | Code reviewed; production HTTP not checked |

## Release blockers (must resolve, not waive)
- Regenerate typed Supabase database bindings for **all four new tables** and replace the intentionally scoped untyped `SupabaseClient` adapter; verify compilation with `npx tsc --noEmit`, `npm run build`, `npm run lint`.
- Reconcile four-table schema installed directly in Lovable Cloud with migration-as-code history using an idempotent, reviewed baseline/adoption strategy; do **not** replay the existing `CREATE TABLE` draft against live Production.
- Inspect preview deploy routing and ensure generated TanStack route tree includes the new admin route. Repository's checked-in `src/routeTree.gen.ts` may lag code generation; do not edit autogenerated file by hand.
- Verify direct **real-JWT HTTP** admin & non-admin matrix; SQL `SET ROLE` simulation is not a substitute.
- Establish identity/evidence review/audit trail lifecycle before claiming "verified" sources or enabling publication.
- Only after review, obtain separate **explicit Founder approval** to merge/deploy; no automatic migration or seed.

## Data integrity / safety guardrails
- Only internal `publication_status='draft'` records; no university import, public publication, DELETE, admin role assignment, opportunity update or deployment while review is pending.
- Admin client-side UI gate is not authorization; database RLS remains primary.
- SSL/HTTPS-only URL form validation is not evidence of institutional ownership. Checks of accrediting authority, official website, scholarship eligibility, and application links are independent research tasks.
- Production backup listing was visually confirmed previously; restore test was NOT performed.
