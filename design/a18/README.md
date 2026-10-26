# ICK Opportunities — A1.8 Phase 2: Isolated Alert Database & RLS Validation

**Snapshot: 2026-10-26. Proposed schema + disposable PostgreSQL tests ONLY. NOT APPLIED to Lovable Cloud Production or Staging.**

## Why this exists
PR #37 deployed a **passive**, default-OFF candidate generator only; it did not create notification storage, opt-in UI or a delivery service. This follow-on phase verifies an **illustrative** relational storage and least-privilege RLS design in a temporary GitHub Actions PostgreSQL 16 container. It is intentionally NOT placed in the project's production migration directories.

## Verified Production baseline before proposal
Read-only Lovable Cloud query: `public.profiles.id` is UUID, `public.saved_opportunities(user_id, opportunity_id)` are UUIDs, and `public.opportunities.id` is UUID; category enum is `public.opportunity_category`. The existing public opportunities RLS SELECT policy requires active, verified, reviewed-by and reviewed-at non-null, published_at <= now(), and a non-expired deadline. **Never query unreviewed opportunities for alert delivery.**

No alert preference/notification tables had been detected in the previous read-only inventory; no migration is run in this phase.

## Prototype contract
- `design/a18/alert_schema_prototype.sql` deliberately starts with a conspicuous **NOT A PRODUCTION MIGRATION** warning. It depends on a pre-existing `auth.users`, `auth.uid()`, `public.opportunity_category`, `public.opportunities`.
- `alert_preferences`: one row per authenticated user, explicit `enabled = false` default, new-matches and saved-deadlines subordinate toggles, selected categories, validated 0..100 match threshold, 1/3/7 deadline windows, conservative timezone **format only**. Real IANA timezone identity MUST be validated by the trusted app; do not infer eligibility.
- `user_notifications`: only structured IDs / kinds / event keys / timestamps; no sensitive title, eligibility, profile, email or phone snapshot stored. `UNIQUE(user_id,event_key)` is the required persistence-level dedupe. No client-side INSERT or DELETE; user may read or update ONLY `read_at` and `dismissed_at` for owned rows. A trusted delivery mechanism must be separately approved.
- All tables RLS ENABLED. Explicitly revoke `PUBLIC`, `anon`, and `authenticated` grants before only giving needed permissions.
- Rows for revoked or expired opportunities may remain as history but client Notification Center MUST re-fetch original opportunity under existing strict public SELECT RLS and hide/redact inaccessible listing details. The user-owned `opportunity_id` is not a grant to read a draft.

## What is tested
The GitHub workflow `.github/workflows/a18-isolated-db-ci.yml` uses a **disposable PostgreSQL 16 Docker service**. `tests/a18/db_isolated_fixture.sql` creates **fake** roles, auth.uid based on user-id session variable, and minimal opportunities IDs. The `db_isolated_security.sql` suite checks RLS ON, PUBLIC and anon grants revoked, preference ownership, default disabled, user-A cannot view/change user-B data, a role without uid sees no user data, ability to mark only owned notifications read, denial of client notification INSERT or immutable edits, and unique event enforcement.

**Important limit:** The test changes a local PostgreSQL session setting instead of presenting a **cryptographically signed Supabase JWT**. It proves SQL-level policy mechanics only. Do not claim that real token validation, browser API permission tests, full production integration, auth service safety, revoke visibility or release readiness have passed.

## Before real deployment — required Founder-approved gates
1. **Review the schema proposal** against current Lovable Cloud schema, auth `users`, privileges, extensions, grant inheritance, available quota and migration conflicts. Confirm naming conventions and timestamp policy. Decide whether preference owner can delete rows; deleting a preference must be interpreted as opt-out.
2. The isolated prototype already rejects NULL elements and duplicate values in preference arrays; still normalize and validate timezone using an IANA library in the future trusted backend and test real API preference payloads. Avoid relying on client-side input validation alone.
3. **Rehearse actual migration** on a truly isolated Lovable Cloud-compatible staging database. The CI test fixture is incomplete and not an alternative to a real staging clone.
4. With two genuine SIGNED JWT accounts (A and B) and anon role, run cross-tenant read/write denial, role-change, row tampering and immutable event-key tests through real Supabase client and PostgREST. Check pre-existing default grants and any SECURITY DEFINER RPCs. No service secret in frontend.
5. Finalize audit logs, idempotent trusted worker and consent re-check at persistence time, rate limits, retention, kill switch and notification revocation policy. Test concurrency `ON CONFLICT DO NOTHING` and subscriber opt-out.
6. Build and QA explicit opt-in UI + authenticated Notification Center (empty, unread, dismissed, revoked, zero and error states). Only then enable alert delivery through a separate Founder-approved release.
7. Production SQL, schema changes, jobs and release must be **explicitly authorized separately** after the above stages. This PR may be reviewed or merged as a design/test artifact without triggering a live alert or changing Production DB.

## Related
- Existing Phase 1 code: `src/lib/opportunity-alerts.ts` (PR #37; code-only, passive).
- Scope/roadmap: `docs/alerts/ICK_A18_PHASE1_ALERTS_ARCHITECTURE_2026-10-26.md`.
- Existing work issue: #35.
- Niger private university onboarding: paused at Founder's direction. Not in scope.

Sources: Supabase RLS / grants https://supabase.com/docs/guides/database/postgres/row-level-security , Supabase column-level security https://supabase.com/docs/guides/database/postgres/column-level-security .
