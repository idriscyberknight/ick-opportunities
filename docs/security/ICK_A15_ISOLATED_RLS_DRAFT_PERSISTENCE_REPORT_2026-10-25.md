# ICK Opportunities A1.5 — Isolated Draft Persistence & SQL-RLS Acceptance Evidence

**Date:** 2026-10-25  
**Scope:** reproducible, disposable **PostgreSQL 17** CI container  
**Mode:** synthetic test data ONLY; no Lovable Cloud or live Supabase connection  
**GitHub Actions:** https://github.com/idriscyberknight/ick-opportunities/actions/runs/40185418859  
**PR:** https://github.com/idriscyberknight/ick-opportunities/pull/22 (DRAFT; not merged)

## Scope of PASS — verified by action logs

CI checked out the A1.5 draft branch and successfully ran:

1. `tests/a15/isolated_bootstrap.sql` — creates **mock** `auth.users`, role table, `auth.uid()`, and the SQL-equivalent of the live `public.has_role()` in a disposable PostgreSQL 17 container. **It does not mint or validate actual JWTs.**
2. `docs/database/ICK_UNIVERSITY_REGISTRY_SCHEMA_DRAFT.sql` — applies the previously approved **historical original schema DDL** ONLY against the isolated CI container, NOT Production and NOT the real migration ledger. This ensures tested policy definitions match the source SQL file.
3. `tests/a15/isolated_registry_acceptance.sql` — runs under simulated PostgreSQL `authenticated` and `anon` roles and simulated `request.jwt.claim.sub`, with test-only UUIDs and `example.invalid` URL references:
   - Synthetic Admin inserts and reads **two draft universities**.
   - Synthetic Admin updates one university draft and confirms persistence within the transaction.
   - Synthetic Admin inserts alias, unreviewed evidence and evidence-linked classification.
   - Cross-institution evidence FK rejects wrong-university classification.
   - Publication CHECK rejects a synthetic attempt to publish.
   - Synthetic ordinary user cannot read fixture university, alias, evidence or classification rows (all four result zero).
   - Ordinary user INSERT denied by RLS for all four registry tables.
   - Ordinary user UPDATE affects zero records across all four tables.
   - Ordinary user DELETE denied (no grant).
   - `anon` cannot SELECT or INSERT into private `universities`.
   - Transaction `ROLLBACK` means test fixture writes are not persistent.
4. CI log states `A1.5 ISOLATED POSTGRES ROLE/ROW FIXTURE TESTS COMPLETE` at 2026-10-25T10:36:44Z. All required steps **PASS**.
5. Vite build and strict TypeScript **PASS**; A1.5 scoped ESLint **PASS**. Global repository ESLint still reports **1,341 errors, 7 warnings** and is explicitly report-only (`continue-on-error`); therefore global lint is NOT PASS.

## Important interpretation — do not overclaim

This is an **actual executable SQL/Postgres RLS and database persistence** test in isolation, not a frontend/browser Admin form test and not real Supabase Auth HTTP/JWT verification.

Previous existing-account Admin and Normal User preview screenshots validated real sessions and four read-only HTTP endpoints. Because Production registry tables were empty, those read-only requests **could not** prove non-admin row isolation against nonempty live data. This isolated test fills that specific *Postgres role-policy simulation* gap, not the live PostgREST/JWT gap.

**Still NOT verified:**
- A1.5 browser form actually persists and reloads a draft against the **real Lovable Cloud endpoint**, including user-facing errors and related source records.
- A real authenticated non-admin REST `POST`/`PATCH` request is denied by live RLS (no such real-JWT write request was sent).
- End-to-end real-session read isolation when the actual Lovable Cloud registry contains private data.
- Automatic generated types and migration ledger reconciliation, full global lint, complete editorial audit and source verification.

**Risk boundary:** A preview deployment might point to the same Production database. Do not run an actual Admin draft CREATE or unauthorized POST against the connected backend without a **specific, separate Founder-approved controlled-write plan**. A mistakenly permitted write could persist and affect live data.

## Exit criteria for next decision

Do not merge PR #22 yet. Agree on safe isolated integration test environment for real PostgREST/JWT flows or a narrowly bounded, reversible, observed controlled-write test with independent readback and cleanup approval. This report alone **does not constitute a production release authorization**.
