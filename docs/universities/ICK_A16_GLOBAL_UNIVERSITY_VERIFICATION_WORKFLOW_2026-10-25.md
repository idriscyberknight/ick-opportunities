# ICK Opportunities — A1.6 Global University Verification & Editorial Workflow

**Date:** 2026-10-25  
**Status:** proposed operating standard + read-only editorial UI aid. **NOT** a deployed verification or publishing system.  
**Project:** ICK Opportunities under ICK Technologies. Global scope; begin with careful Nigeria-first validation, expand country by country.  
**Authority:** Founder to approve review rules and later Production migrations.  

## 1. Starting point: established facts versus incomplete controls

**Verified as of A1.5:** ICK Opportunities Lovable Cloud Production has four university registry tables, 12 admin-only RLS policies and a fail-closed `universities_no_publishing_yet` CHECK. Admin draft creation/edit works on Production. Founder verified Normal User was denied the Admin UI, and a preview-only real authenticated Normal User session received PostgreSQL 42501 for INSERT attempts against all four protected tables. Rollback and cleanup SQL readback showed zero test records. A1.5 code is on `main`.

**Not verified/implemented:** Production real-JWT cross-user isolation against nonempty private records; non-admin PATCH denial on a private row; formal editorial review with a tamper-resistant audit log; live regulator checking; automated source retrieval; accredited-institution status; university publication; public-read policies for registry rows; provenance-backed scholarship search; migration ledger reconciliation.

**Consequently:** No real university may be called verified or published from the new registry yet. The eight prior public editorial university entries are **separate static content** and must not be claimed as imported from these tables.

## 2. Truth model — separate claims

| Claim | Evidence required before any verified label | Not sufficient |
| --- | --- | --- |
| Institutional identity | Official institution page plus national/independent identity reference where available | Matching name, logo, domain alone |
| Institutional recognition | Current national ministry/regulator directory or authorized national quality assurance source | ROR or generic Google result |
| Official website | Independent registry/authority cross-link to the institution's controlled domain | HTTPS alone |
| Islamic institution | Direct governance/charter/official mission wording plus independently checked corroboration | Arabic name, region, religious students, courses alone |
| Islamic studies provider | Official programmes or academic department listing with confirmed institution identity | Religious affiliation assumption |
| Scholarship/opportunity | Official programme notice, opening/closing dates, eligibility, benefits, direct application link verified separately | Being a recognized university |
| Multilingual alias | Institution-published or authoritative source documenting the specific spelling or abbreviation | Machine translation alone |

**Institution identity, accreditation/recognition, subject specialization, faith affiliation, programme existence and actual scholarships are independent claims.** Never promote one to stand for another.

## 3. Source hierarchy and due diligence

1. **Country-specific statutory regulator / government authority**, preferably current licensing or accreditation entry for the *specific institution*, campus and programme where relevant. Example Nigeria: NUC official directory, https://enuc.nuc.edu.ng/nus. Registration at institution level does not prove programme accreditation.
2. **IAU World Higher Education Database (WHED)**, https://iau.global/World-Higher-Education-Database-WHED and https://whed.net/About.html. Cross-check scope, institution type, recognition, spelling and country authority references. Confirm any access and republication licensing restrictions before automated import.
3. **Official institution website** linked from a trustworthy independently recognized source; verify name, country, city, governing body, campus, degrees and official pages. HTTPS and a familiar domain pattern are insufficient alone.
4. **ROR** https://ror.org/registry/ and https://ror.readme.io/docs/rest-api. Use v2 persistent organization IDs to resolve aliases and avoid duplicates; ROR covers research organizations and **does not certify educational accreditation**. Match country, city, website, and organizational relationships; do not infer accreditation.
5. **Secondary supporting records** (reputable professional associations or official multi-lateral programmes); never permit a secondary-only source to establish statutory recognition.

For every institution, identify the local regulator, the exact claim being checked, source date, date checked, reviewer, independent corroboration, validity/caveats and future revisit date. A reviewer's assessment of a linked URL is NOT automatic fact extraction.

## 4. A1.6 workflow — editorial stages (proposed; NOT implemented)

**D0 — Candidate captured:** an Admin creates a private draft `pending_review`; no display on public registry. Source and alias attachments begin as unreviewed.

**D1 — Identity investigated:** reviewer confirms exact legal/official name, country, relevant campus, authority and official website. Record a reference URL for each claim; don't classify a university by its name.

**D2 — Recognition/quality assurance checked:** confirm regulator/authority and the scope of its decision, including campus or programmes and date. If disputed, suspended, merged, dissolved or ambiguous, keep `needs_reverification` or `rejected` and block publication.

**D3 — Specialized classification investigated:** distinguish `islamic_institution` (institution's actual character/charter) from `islamic_studies_provider` (offers particular programmes). A university may qualify for neither or both; a course alone does not establish university identity.

**D4 — Editorial approval:** require trusted reviewer identity and an immutable audit event linking each approved claim and source snapshot. Where staffing permits, reviewer distinct from creator; single-founder MVP may collect drafts but publication stays disabled until an approved authorization/audit approach exists.

**D5 — Publication release:** **future separate phase only**: secure server-side atomic operation checks all preconditions, revision consistency, accepted reviewer evidence, active institution, moderation decision, and identity of approver. Requires founder-approved migration removing `universities_no_publishing_yet` only alongside enforced publish RPC, controlled public-read RLS, audit, tests, monitoring and rollback strategy.

**D6 — Reverification:** scheduled independent source rechecks; if the official regulator removes recognition or evidence becomes stale, unpublish atomically using separately approved controls. No silent auto-approval or auto-publication.

## 5. Schema mapping and limitations

| Current table | Existing usage | Missing for a production reviewer workflow |
| --- | --- | --- |
| `universities` | Internal institution identity, `pending_review` + `draft`, reviewer/date fields reserved | Verified status transitions must be controlled server-side and audited |
| `university_aliases` | Multi-language variant names | Claim-specific provenance for each alias, scripts/language policy |
| `university_evidence` | URL, claim type, `pending_review`, checked-by/time and visibility reserved | Immutable review decisions, retractions, authority category, source snapshot metadata, freshness expiry |
| `university_classifications` | Distinct institution/studies categories, composite FK to same-university evidence | Review audit, source validity transitions, stale-evidence invalidation |

Current admin interface is draft-only. Its new **A1.6 Source Checklist** shows *whether a source was attached*, not whether it was independently validated. Even the existing `review_status='reviewed'` is insufficient by itself to justify a verified or published label absent enforced backend provenance and reviewer controls.

**Publishing release gate:** protect on the database, not only in TypeScript or client UI. Never directly `UPDATE publication_status='published'` or create public SELECT policies without the full atomic review lifecycle.

## 6. Evidence quality review rubric (human assessment)

For each institution or claim, reviewers should record independently:
- Official regulator or reference body and its jurisdiction; actual source link, date checked.
- Institution legal/operating identity, ownership, governing charter, former names and duplications.
- Specific regulator status, any caveats (campus/degree/suspension); whether evidence is current.
- Official institution domain, technical safety of the destination, relevant documented page.
- ROR ID if applicable **as deduplication only**.
- Source-language and translation confidence; save original-script aliases.
- When claiming Islamic identity or studies, cite the precise officially supported criterion.
- Clear decision `needs_evidence / disputed / verified / rejected` **only when authorized workflow exists**.
- Next review date / revocation and dispute mechanism.

## 7. Release-blocking security and data integrity requirements

- Production baseline signed off: current schema, migration history and runner reconciled; **do not replay the historical CREATE TABLE SQL**.
- Generate proper types from the *correct* Lovable Cloud backend; don't use an unrelated personal Supabase instance.
- Database transaction / authenticated server-side function performs approval + audit atomically, checks current evidence and enforces authorized reviewer policy.
- Non-admin real-JWT GET, POST, PATCH, DELETE tests with nonempty fixtures, plus anon, creator, reviewer and service roles.
- Ensure public search reads only fully published verified records; audit existing legacy opportunity RLS separately (previous P1 identified).
- Parameterized server queries, safe outbound links, rate limits, source URL validation, CSP, no leaked tokens, basic anti-SSRF policy if a future fetcher is added. The current A1.6 UI **does not fetch external URLs**.
- Explicit data licensing review for WHED/national lists; no bulk scrape or publish without applicable permissions.
- Stable identifiers + deduplication policies and merge/tombstone strategy; careful updates for renamed institutions.
- Backups, tested rollback, monitoring and incident escalation before enabling publication.
- Founder authorization for Production schema changes, merge/release, data imports and publication.

## 8. Testable acceptance matrix (future)

| Test | Expected |
| --- | --- |
| Draft lacks authority evidence | Never marked verified or published |
| User attaches HTTPS-only unauthoritative site | Remains unreviewed; no approval |
| ROR record exists but regulator status unknown | Institution recognition still unverified |
| Islamic studies only, no religious charter | May be studies provider but not inferred Islamic institution |
| Classification evidence belongs to other university | Database FK rejects |
| Original evidence rejected/stale | Dependent claims become nonpublishable |
| Unauthenticated/non-admin real JWT | Cannot read draft or mutate registry |
| Unauthorized reviewer/creator | Cannot set reviewed/verified/published |
| Successful approval | Single atomic transaction + immutable actor/time/claim audit |
| Publish without current verified review | Fail-closed |
| Revalidation fails / authority revokes | Scheduled review and rollback process |
| Public directory | Only approved, explicitly published, correctly sourced records |

## 9. Implementation boundary of this PR

This PR is **Phase A1.6.1 only**: explanatory read-only checklist and source links in existing Admin registry + this design record. It performs no new database writes and grants no new privileges. The gate intentionally cannot mark sources verified or publish institutions.

Next is A1.6.2 design of atomic backend editorial decision + immutable audit and source freshness rules, followed by founder approval and **separately tested** schema/authorization changes. Do not merge this PR or deploy it as implicit consent to the later stages.

## 10. Authoritative primary references (checked 2026-10-25)

- IAU World Higher Education Database description: https://iau.global/World-Higher-Education-Database-WHED
- WHED official description: https://whed.net/About.html
- Nigeria National Universities Commission / NUS verified university directory: https://enuc.nuc.edu.ng/nus
- ROR registry scope and licensing: https://ror.org/registry/
- ROR v2 API guidance: https://ror.readme.io/docs/rest-api
- Lovable historical schema and Production registry status: `docs/database/ICK_A14_LIVE_SCHEMA_BASELINE_2026-10-25.md`
- A1.5 role/JWT acceptance evidence: GitHub PR #24 (closed unmerged), plus independent Production DB SQL readback, as recorded in the project conversation.

**Verification note:** These external sources explain *where reviewers can investigate*. They are not evidence of any individual institution's recognition, admissions, accreditation, scholarship availability or suitability.
