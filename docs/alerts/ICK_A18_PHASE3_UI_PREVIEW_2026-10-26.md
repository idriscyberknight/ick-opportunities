# ICK Opportunities A1.8 Phase 3 — Non-live Notification Center & Preferences UI

**Date:** 2026-10-26. **Deliverable:** a reusable, accessible **UI preview**, not a live alert feature.  
**Parent:** #35; Phase 1 #37 and Phase 2 #38 already merged.

## Verified context and boundary
- Prior Lovable Cloud Production schema review found **no** `alert_preferences` or `user_notifications` tables. A fresh check during Phase 3 was blocked by the free-tier connector database-query limit, so we **cannot independently reverify** their absence in this run.
- Phase 2 `design/a18/alert_schema_prototype.sql` is **NOT** a deployed migration. The isolated RLS CI job proved SQL row-policy mechanics against simulated JWT session claims, **not real signed-token access via Supabase REST**.
- Phase 1 `src/lib/opportunity-alerts.ts` derives candidates without storage, delivery or database calls; defaults **OFF**.
- Niger institution integration remains deferred.

## New components

### `src/components/alerts/AlertPreferencesPanel.tsx`
A controlled form supporting opt-in, alert kinds (personalized new matches, saved deadline reminders), opportunity categories, matching threshold and deadline reminder windows. Inputs are inside a disabled fieldset when `readOnly=true`, with conspicuous text **“UI preview only — settings are disabled and cannot be saved. No alerts are being sent.”**

For future activation the parent adapter will need a confirmed signed-in user, validation, explicit Save, authenticated owner-only backend write, server-read-back, and error handling. `onChange` alone is not a save. Do not pass `readOnly=false` in Production before secure persistence and explicit written user consent are implemented.

### `src/components/alerts/NotificationCenterPanel.tsx`
Controlled inbox with states `unavailable`, `loading`, `error`, `disabled`, `ready`. “All/Unread” filters, accessible status messages, mark-read and dismiss buttons (only callable if a safe handler is supplied and `readOnly=false`). Dismissed rows do not show.

`visibleOpportunity` is nullable by design. A vanished/unpublished/revoked opportunity appears as an indistinct, safe fallback (**no title or link**), not a stale link. Before future production use, the owning data adapter must fetch alert rows and join only against opportunities which **the signed-in user can currently SELECT** through existing public opportunity RLS; trust neither archived titles in notifications nor caller-controlled `user_id`.

### Authenticated **unlinked** route `/alerts-preview`
`src/routes/_authenticated/alerts-preview.tsx` is protected by the existing `/_authenticated/route.tsx` account/onboarding guard. It is `noindex,nofollow`, absent from global navigation, renders *only* read-only preferences and an unavailable inbox. No notification DB access, mutations, fake success responses, user tracking, or scheduled jobs.

## Test coverage
`tests/a18/alert-ui-preview.test.ts` tests default-off/disabled opt-in controls, no notification delivery claim, loading/errors/disabled/empty states, no fabricated opportunities, revoked opportunity masking and ignored dismissed notification rows. Existing `bun test tests/a18`, TypeScript+build and scoped ESLint in `a18-alerts-ci.yml` cover new components.

## Mandatory next release gates (NOT implemented by this PR)
1. Review/approve illustrative SQL against a real Lovable-compatible staging database after access and quota confirmation; **never** run design SQL or DB migrations against Production by accident.
2. Apply a separately approved migration to **staging**, then test genuine signed JWT user A, user B, anon via PostgREST. Confirm authorization + session rollover, RLS grants, user ownership and immutable fields.
3. Integrate a real `alert_preferences` adapter with explicit Save/read-back, validated IANA timezone, client account-switching and error handling; default remains OFF. Consent cannot be implied by visiting a preview.
4. Integrate a real `user_notifications` adapter with public-only opportunity join, date revocation, unread counts, optimistic mutation rollback and owner-scoped caching.
5. Build a separately approved backend generation/outbox with opt-out recheck, atomic idempotency, rate limits, retention, kill switch and no service_role key in browser. No email/SMS/push until separately approved.
6. Security, accessibility, performance and end-to-end QA before public navigation, Production SQL, automated triggering or launch.

**No user alerts are live because of this code. No Production SQL or data mutations. Do not merge or deploy without Founder approval.**
