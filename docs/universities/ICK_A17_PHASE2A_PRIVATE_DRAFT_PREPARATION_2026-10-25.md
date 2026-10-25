# A1.7 Phase 2A — Controlled Canonical Draft Preparation

**Status:** Code-only Admin workflow; no database backfill executed by this change. 2026-10-25.

## Goal

Make the already-existing eight public static university identities straightforward to move **one by one** into the secure private registry without duplicating entries or inventing accreditation. The current public directory continues to use its original eight static URLs; this phase is **not** the final switch to database-backed publication.

## Shipped workflow

1. Existing Admin-only University Reconciliation Panel labels each starter profile as unmatched, candidate, ambiguous or country conflict using country-scoped name/alias/domain/slug signals.
2. For an **unmatched** public entry only, Admin can select **Prepare private draft (no write)**. This action only fills the existing new-draft form with the *original public canonical slug*, institution name, country, location and previously listed website. Summaries are deliberately blank to avoid copying assertions as verified.
3. For existing public entries with `websiteVerification='needs_review'` (the Niger starter entry), the website is **intentionally blank**; compound locations such as `Say / Niamey` remain blank pending campus confirmation.
4. Admin must inspect the source, tick the source/duplicate-check acknowledgement and actively press **Create draft**. Slug and country remain frozen during preparation to avoid invisible identity drift; clear preparation to return to normal manual editing.
5. Immediately before that specific prepared create request, the client **re-fetches the latest Admin registry snapshot** and repeats reconciliation. If there is a candidate, conflict or ambiguity, the create is blocked. Database unique-slug constraints and existing Admin RLS are the authoritative final collision and authorization safeguards.
6. The existing `createUniversityDraft` function sends only a **private `pending_review`/`draft` university INSERT** if and only if Admin explicitly submits. No aliases, evidence, classification, reviewer metadata or publishing approval are created automatically. It neither alters public directory data nor grants any new read permissions.

## Verification and known limitations

- CI runs the existing A1.7 dedupe tests plus additional tests for canonical Madinah slug preservation, no automatic review/publication fields, and no adoption of Niger's disputed website.
- This is a human-in-the-loop copy-to-private-draft assistant. It is **not** a mass import, source-of-truth migration or institutional verification.
- The snapshot fetch is limited to 150 universities and 500 aliases; once the private registry grows beyond those caps, server-side complete duplicate detection or pagination must be added before any large-scale onboarding. The unique slug constraint still prevents identical slugs, but other name/alias duplicates cannot be conclusively excluded at scale with this snapshot.
- Future phase: claim-specific sources attached as `pending_review`, human signed Admin reviewed-audit decisions, controlled classifications, and a new independently approved publication snapshot/API migration. Until that approval, `universities_no_publishing_yet` remains active and the public directory remains static.
- Real-world official domains and governmental registers still require current verification; starter inclusion is not evidence of current accreditation, course availability, funding or admissions.

**No Production database SQL, migration, import, deletion, review decision or publication is authorized by this document.**
