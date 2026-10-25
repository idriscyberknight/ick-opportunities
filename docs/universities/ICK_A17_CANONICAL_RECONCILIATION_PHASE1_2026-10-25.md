# A1.7 — University Directory / Database Reconciliation (Phase 1)

**2026-10-25 — Review-only, code-only, no Production SQL and no publishing.**

## Verified existing architecture

- `src/lib/university-directory.ts` contains **8 public static editorial entries** with canonical public slugs and source-linked website claims (not individual programme accreditation).
- `/scholarship-navigator/universities` and `.../:slug` render these eight **without querying** `public.universities`.
- Separately, Lovable Cloud Production `public.universities` had **1 private** `pending_review`/`draft` row: `slug=ick`, `official_name=Y`, `country_code=NG`. This row is **not** an Islamic University of Madinah or IIUM record. There are also private related alias/evidence/classification rows.
- University Registry has Admin-only RLS; publishing remains intentionally blocked by `universities_no_publishing_yet`.
- **Key distinction:** the DB no-publishing constraint does NOT govern the eight separate code-defined public profiles. Do not describe them as database-published or verified universities.

## Phase 1 implemented

`src/lib/university-reconciliation.ts` performs **pure, read-only** identity-candidate matching using **same-country exact canonical slug**, normalized name/alias or institutional HTTPS hostname. It refuses cross-country slug collisions and flags multiple matches. It **does not**:
- accept fuzzy matches that would conflate similarly named universities;
- automatically create, update, merge, delete or publish institution rows;
- lift any Admin-only data into a publicly accessible page;
- equate a matching homepage, name or alias with official institutional accreditation.

`UniversityReconciliationPanel` in the **existing protected Admin Registry** displays counts and flags:
- static-only public entries, private-only drafts, single review candidates, ambiguous duplicates, cross-country slug collisions;
- links to existing public profiles with their **original slugs**; no redirects or broken existing URLs;
- explicit reminders that source checks, source-reviews and public publishing are distinct decisions.

The control is intentionally **read-only**; the current public directory continues to function unchanged.

## Canonical identifiers and the eight existing institutions

| Canonical public slug | Country | Status |
| --- | --- | --- |
| `islamic-university-of-madinah` | SA | Existing static profile; NOT yet a Registry draft |
| `al-azhar-university` | EG | Existing static profile |
| `international-islamic-university-malaysia` | MY | Existing static profile |
| `islamic-university-in-niger` | NE | Existing static profile; institutional homepage flagged for verification |
| `islamic-university-in-uganda` | UG | Existing static profile |
| `international-islamic-university-islamabad` | PK | Existing static profile |
| `uin-syarif-hidayatullah-jakarta` | ID | Existing static profile |
| `islamic-university-of-technology` | BD | Existing static profile |

**Future internal records should preserve these canonical slugs** unless a reviewed canonical-slug migration/redirect is deliberately adopted; proposed different slugs in research PR #32 must not silently become new public identities.

## Phase 2 still requires separate scope and approval

1. Perform canonical website, regulator and alias due diligence for all 8 records (particularly Niger). Scrutinize false affiliation and domain ownership. Avoid scraping or automated import of unverified claims.
2. Approve a **single-source-of-truth publication architecture** that distinguishes private drafts from public profiles. Public read must use only an explicit database-published, validated projection, **never** a direct query of Admin-only draft/evidence tables.
3. Create existing eight private drafts through protected Admin tools only after dedupe, one by one; attach official source evidence as `pending_review`. Never convert source existence into reviewed/accredited status automatically.
4. Design a controlled switchover in which public profiles and old URLs remain stable, public source falls back only for deliberately un-migrated static entries; after all canonical records are validated and explicitly published by a later approved schema and RLS release, retire the static map. **A1.6.2 currently has no university publishing workflow**.
5. Verify exact session authorization, no leakage of private notes/drafts or unreviewed evidence, redirects, snapshots, and correct scholarly programme vs institution classification. Do not claim open scholarships based on an institution profile.

## Checks

- `bun test tests/a17/university-reconciliation.test.ts`: asserts eight entries, duplicate/country conflicts, alias/hostname matching, and no auto-link on ambiguity.
- Vite/TanStack Router production build + TypeScript.
- Scoped ESLint/Prettier on changed application files.
- **No data migrations, Production SQL, opportunistic merges of PR #32, auto-verification or public publishing.**

This Phase 1 is useful immediately as an internal canonical-identity audit. It does **not** imply that the public university directory has migrated to the Production database.
