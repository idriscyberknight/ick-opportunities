# ICK Opportunities — Global University Registry
## Phase 3B.3A — Database Architecture Proposal v1.0

**Status:** DESIGN ONLY / NOT DEPLOYED  
**Date:** 2026-10-23  
**Branch target:** `feat/ick-global-university-database`  
**Authoritative environment:** ICK Opportunities Lovable-managed Supabase project; exact Supabase project ref and migration deployment mechanism MUST be confirmed before any migration.

> **IMPORTANT:** This document proposes database changes. It is not an executable migration and must not be pasted into SQL Editor as instructions to change the live database. No existing ICK database tables, users, opportunities, or RLS policies should be modified at this stage.

## 1. Objectives and non-goals

Build a durable directory of internationally discoverable universities, including Islamic universities and universities with Islamic Studies programmes, without confusing an institution listing with an active scholarship offer. Preserve the existing `opportunities`, `opportunity_sources`, and `opportunity_audit_logs` model; do not duplicate opportunity records or alter login, recommendations, and tracking. Initial dataset is eight editorial starter records; no claim of complete coverage or verified accreditation/application availability.

Non-goals for this first release: automatic harvesting of all worldwide universities, verified accreditation for every institution, eligibility probability, programme-level scholarship matching, editing production data through AI, or one-click applications.

## 2. Read-only evidence observed 2026-10-23

- `public.opportunities`, `public.opportunity_sources`, and `public.opportunity_audit_logs` exist.
- No `public.universities`, `public.academic_programmes`, `public.scholarship_programmes`, or `public.scholarship_cycles` table was found in an information-schema name search.
- Existing admin access uses `public.has_role(auth.uid(), 'admin'::public.app_role)`; `has_role` accepts a UUID and `app_role`.
- Current public opportunity SELECT policy checks `status='active'` and deadline, but **does not** require `verified_status='verified'` or `published_at IS NOT NULL`. This is a separate prioritized remediation item, NOT to be silently bundled into the registry migration.
- Recent privilege probe of existing tables: `anon` has SELECT on `opportunities`, but NOT TRUNCATE there or INSERT on `opportunity_sources`; `authenticated` lacks TRUNCATE on `opportunities`. Older security reports may be out of date; inspect effective privileges immediately before deployment.
- `src/lib/university-directory.ts` on `main` holds eight editorial starter institution records, rather than live database-backed records.

## 3. Proposed first-stage tables (four)

### A. `public.universities`

**Purpose:** Stable institutional identity and editorial publication lifecycle.

| Column | Suggested type | Rule / meaning |
|---|---|---|
| `id` | `uuid` | PK, generated UUID, never use name as permanent ID |
| `slug` | `text` | required, globally unique, lowercase URL-safe; changing slug needs redirects |
| `official_name` | `text` | required, trimmed, not empty |
| `country_code` | `char(2)` | required ISO 3166-1 alpha-2, uppercase; check format, validate code list in importer |
| `city` | `text` | nullable |
| `official_website` | `text` | nullable until checked; validate HTTPS URL and actual institutional ownership in editorial process |
| `summary` | `text` | nullable; descriptive only, not an admissions promise |
| `ror_id` | `text` | nullable, unique when present, optional identifier, never required |
| `verification_status` | constrained `text` | `pending_review`, `verified`, `needs_reverification`, `rejected`; default `pending_review` |
| `publication_status` | constrained `text` | `draft`, `published`, `archived`; default `draft` |
| `reviewed_by` | `uuid` | nullable reference to an authenticated user; only admins set |
| `reviewed_at` | `timestamptz` | nullable, records actual completed review |
| `published_at` | `timestamptz` | nullable, requires verified status + review metadata + accepted evidence |
| `created_by` | `uuid` | nullable authenticated user FK, admin or approved ingest actor |
| `created_at` / `updated_at` | `timestamptz` | defaults to now; update timestamp maintained by a known safe trigger |

**Invariants:** Published rows must also be `verified`, have review metadata, publication timestamp, and at least one reviewed identity/website source. The source requirement crosses tables and must be enforced by the approved publishing workflow/transaction (a single-row CHECK cannot enforce it). Draft rows must never be returned by public APIs merely because their URL is known. Never equate `verification_status='verified'` with verified scholarship availability or accreditation.

### B. `public.university_aliases`

**Purpose:** Alternative spellings, Arabic names, transliterations, and abbreviations.

- `id` UUID PK; `university_id` UUID NOT NULL FK to `universities`.
- `alias` text required; `language_code` nullable BCP-47 tag (e.g. `ar`, `en`, `fr`); `script_code` optional; `created_at`.
- Unique per-university normalized alias (`lower(trim(alias))` as baseline); do **not** enforce global uniqueness because abbreviations such as IIU are ambiguous.
- Public reading only for aliases of approved, published universities; admin-only writes. On deletion: review whether aliases should cascade; production strategy should prefer soft archival of universities.

### C. `public.university_evidence`

**Purpose:** Trace exactly which official source supports which institution claim.

- `id` UUID PK; `university_id` FK; `claim_type` constrained text (`identity`, `website`, `classification`, `programmes`, `accreditation`, `other`).
- `source_url` HTTPS text, `source_title` text, `checked_at` timestamptz, `checked_by` UUID nullable, `review_status` (`pending_review`,`reviewed`,`rejected`), `visibility` (`internal`,`public`), `created_at`.
- Keep reviewer's **internal notes** in a separate admin-only review/audit record, not in publicly readable evidence fields.
- A checked website is **not** proof of accreditation, an available scholarship, eligibility, a particular application cycle, or a given deadline.
- Public SELECT only for `visibility='public' AND review_status='reviewed'` evidence linked to a public-approved university; admin-only write privileges.

### D. `public.university_classifications`

**Purpose:** Permit overlapping categories backed by evidence. A university may be both an Islamic institution and an Islamic Studies provider.

- `id` UUID PK; `university_id` UUID FK; `classification_key` constrained text (initial values: `islamic_institution`, `islamic_studies_provider`, `general_institution`); `evidence_id` UUID FK to `university_evidence`; `review_status` (`pending_review`, `reviewed`, `rejected`); timestamps.
- Unique per (`university_id`,`classification_key`) for reviewed/current assignments; verify the referenced evidence belongs to that same institution (enforced in the publishing workflow or via a composite FK design).
- Institution classifications reflect confirmed institutional characteristics, NOT geography or the religion of individual students. Do not label every university in a Muslim-majority country an Islamic university.

## 4. Relationships

```text
universities (1)
  ├─ (many) university_aliases
  ├─ (many) university_evidence
  └─ (many) university_classifications ── evidence reference

Future only:
  universities (1) ─── academic_programmes (many)
  scholarship_programmes (1) ─── scholarship_cycles (many)
  institutions <── programme_provider_links ──> scholarship_programmes
  scholarship_cycles <── structured_eligibility_rules
  existing opportunities <── optional reviewed cross-reference, not duplicated records
```

Do not assume that every scholarship belongs to only one institution: joint programmes and external scholarship funders exist. Design this many-to-many relationship when that phase begins.

## 5. Publishing governance

1. An admin creates a **draft** university record.
2. Existing slugs, domains, ROR IDs, names and aliases are checked for potential duplicates.
3. Admin records the institutional official website and claim-specific source evidence.
4. A reviewer approves source evidence and classification claims. The reviewed claims are not generic blanket accreditation approval.
5. Publishing operation re-checks approval and evidence, sets `verification_status=verified`, `publication_status=published`, `reviewed_by`, `reviewed_at`, `published_at` in a controlled transaction.
6. On source changes or uncertainty, change to `needs_reverification` or unpublish; public records are filtered out as policy dictates.
7. Every approval, edit, publication, archival and retraction must be audited. Reuse audit patterns where appropriate, but keep university audit identity distinct from opportunity audit semantics.

## 6. Security model and RLS specification (DESIGN, not deployed)

**On every new exposed `public` table:** enable RLS immediately; explicitly audit/restrict schema grants. Do not assume RLS makes TRUNCATE or arbitrary function execution safe. Use the existing admin role helper after verifying its grants and implementation.

| Actor | universities | aliases | evidence | classifications |
|---|---|---|---|---|
| `anon` | SELECT approved public rows only | SELECT only aliases of approved public institutions | SELECT reviewed+public evidence of approved public institutions | SELECT reviewed categories of approved public institutions |
| `authenticated` ordinary user | Same public SELECT | Same public SELECT | Same public SELECT | Same public SELECT |
| `authenticated` with admin role | SELECT + INSERT/UPDATE/DELETE per editorial policy | Administrative CRUD | Administrative CRUD | Administrative CRUD |
| `service_role` | Privileged backend operations only, isolated from browsers | Same | Same | Same |

**University public row condition:**

`publication_status='published' AND verification_status='verified' AND published_at IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL`.

**Admin write condition:** `public.has_role((select auth.uid()), 'admin'::public.app_role)` enforced on both `USING` (for UPDATE/DELETE) and `WITH CHECK` (for INSERT/UPDATE); use least-privilege table GRANTs. Do not rely on user-editable metadata for admin privilege decisions. New client-facing privileges must be inspected after migration because default privileges have caused problems in this project before.

**Caution about RLS composition:** permissive policies combine with OR. Admin SELECT is separate from the public SELECT, and a published row must not become writable to ordinary users through an overly broad policy. Control all published claims through backend authorization, not only React filters.

**RLS validation:** test anon, ordinary authenticated, admin, and service-role behaviors separately, including attempts to see guessed draft UUIDs and internal evidence; verify denial of anon writes, direct REST queries, and ordinary-user admin mutations. Verify table grants (`TRUNCATE` included) and any privileged functions.

## 7. Search / UX contracts

- **Search institution identity:** name, alias, city, country, category, with normalization and pagination. Queries should be indexed; avoid returning thousands of rows to the browser for client-side filtering.
- **Search scholarship opportunity:** not powered by institution existence; requires a linked, verified current application cycle in a later phase.
- **Evidence state:** clear labels: `Institution information verified`, `Source needs recheck`, `Scholarship application status unknown`. Do not use a single `Verified` badge across all claims.
- **Future filters:** destination, student nationality, programme, level, language, funding, and admission window; show filters only when the backing data and interpretation are implemented.
- **Localisation:** Hausa, English, Arabic, French; Arabic aliases searchable, RTL interface separately tested.

## 8. Safe migration and rollout plan

**Gate 0 — Current stage:** document spec and RLS model in GitHub feature branch. No SQL migration, DB writes, changes to Supabase config, code deployment, or production data.

**Gate 1:** identify the exact backing Supabase project/ref for the production application and verify deployment/preview/staging isolation; capture backup and rollback plan. A GitHub branch or Vercel Preview does NOT automatically mean there is a separate staging database.

**Gate 2:** use the installed Supabase CLI's `supabase migration new` under a controlled local environment to generate the actual timestamped migration filename. Review against existing migrations and effective default grants. Prepare a second migration for existing `opportunities` publishing RLS separately (requires regression testing).

**Gate 3:** run the migration and RLS tests on isolated staging/local DB, including duplicate detection, draft visibility, evidence privacy, rollback and compatibility with existing authentication.

**Gate 4:** authorized production migration only after founder approval, backup, and satisfactory staging results. Re-run schema/RLS/privilege inspections.

**Gate 5:** gradual import of the eight existing frontend institutions as draft/editorial candidates. Do not bulk mark them verified because a `sourceCheckedOn` value is present. Build reviewed directory API, replace static starter list only after read path is tested.

## 9. Definition of done (Phase 3B.3A)

- [x] Existing related tables and public policy inspected read-only.
- [x] First-stage entity definitions and relationships proposed.
- [x] RLS access matrix proposed.
- [ ] Founder reviews this architecture.
- [ ] Migration SQL prepared, staged, and tested.
- [ ] Exact deployment target verified.
- [ ] No data migrated yet.

## 10. Risks / decisions required

1. **Publication policy gap (existing opportunities):** public opportunity RLS does not itself require verification/publication timestamp. Track as a separate P1 security remediation before new scholarships are released.
2. **Evidence accuracy:** `sourceCheckedOn` on eight seed records is not an auditable statement of accreditation or application status.
3. **Data completeness:** the directory is eight records today; any universal coverage claim would be false.
4. **Cost:** begin with simple indexed Postgres search and human review; don't deploy expensive crawlers, embedding infrastructure, or automated AI decisions without clear need.
5. **Data licensing:** official websites and association registries are sources for verification, not blanket permission to copy proprietary datasets.
6. **Governance choice:** whether separate staff roles (e.g., reviewer/editor) are needed can be postponed; existing admin-only editorial rights provide a safer first stage.

**Design decision proposed:** start with these four first-stage tables and postpone scholarship-cycle/eligibility tables until institution identity, sources, and public visibility are reliable.
