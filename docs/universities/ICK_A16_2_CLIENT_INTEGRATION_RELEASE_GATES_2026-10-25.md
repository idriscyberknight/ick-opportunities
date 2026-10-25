# ICK Opportunities — A1.6.2 editorial client integration (PREVIEW / NOT LIVE)

**Date:** 2026-10-25  
**Scope:** Code-only draft UI integration on top of existing A1.6.1 Production Admin Registry.  
**Status:** FRONTEND PR ONLY. This does not install the PostgreSQL A1.6.2 review engine.

## Verified boundary at implementation

Production ICK Opportunities Lovable Cloud was queried read-only on 2026-10-25:
- `ick_a16_review_evidence` RPC count **0**
- `public.university_review_events` exists **false**
- `universities_no_publishing_yet` validated constraint count **1**
- `universities` rows **1** (private institution data was NOT inspected or altered)

The authorized, separate PostgreSQL 17 isolated prototype is in draft **PR #27**; it passed SQL-only isolated CI at commit `2ad062be4695ee79b5467aa37e3bc3c28a5a513a`. The SQL is **not** a production migration. PR #26 records the RFC; neither PR #26 nor PR #27 is a production deployment.

## Changed client integration

1. `updateUniversityDraft` now updates only `official_name`, `country_code`, `city`, `official_website`, `summary`. It no longer sends direct `verification_status`, `reviewed_by`, or `reviewed_at` updates. The targeted row must remain `publication_status='draft'` AND `verification_status='pending_review'`.
2. On the Admin University Registry screen, draft editing becomes disabled if the current selection is not a pending private draft or **has any source already marked reviewed**. The future database trigger in PR #27 enforces the second restriction; UI alone does not.
3. An A1.6.2 source-review form has fields for pending source, decision and human rationale. It is **disabled by the hard-coded, fail-closed release gate** `A16_EVIDENCE_REVIEW_RELEASE_ENABLED = false`. The service repeats the gate before any RPC call. Thus the preview/Production cannot submit a review even if the UI is manipulated.
4. For a **future separately approved release**, the service calls `ick_a16_review_evidence(p_evidence_id, p_decision, p_reason, p_expected_state='pending_review')`. It NEVER writes `review_status` or `university_review_events` directly from the browser.
5. RPC TypeScript declaration is an interim proposed contract; unlike generated database types, it does **not** prove backend existence or security.

## Safe rollout order — requirements, not an automatic plan

- **First:** review PR #26/#27 for full privilege coverage, review lifecycle, immutable-to-app-role event log, auth checks, concurrency and source freshness. Correct SQL-only prototype as needed and pass isolated tests.
- **Second:** reconcile Lovable Cloud migration runner and historical ledger without replaying already-installed A1.4 CREATE TABLE DDL; review backup/restore and rollback. No `supabase db push` or direct historical replay.
- **Third:** approve explicit Production SQL migration only after isolated rehearsal and authorized change window; query all ten sensitive-column grants, publication guard, RPC EXECUTE and events table RLS.
- **Fourth:** deploy compatible draft-only frontend code and run existing Admin create/edit and Normal User denial regression tests with signed sessions; ensure only the five safe columns are patched.
- **Fifth:** in a distinct Founder-approved frontend PR, enable the A1.6.2 review feature gate AFTER verifying backend function and event counts through actual signed-JWT acceptance, then audit a specific controlled review transaction.
- **Never:** merge SQL prototype test fixtures into an executable Production migration or silently enable university public publishing.

## Acceptance matrix

| Check | Expected |
| --- | --- |
| Existing pending draft update via Admin | Updates safe metadata, still pending, no review status mutation |
| Edit attempted after source marked reviewed | UI locked AND database identity-edit trigger denies API bypass (after migration) |
| No RPC on current Production | Submission impossible while release gate false |
| Signed Normal User | Cannot access Admin Registry or call future privileged review RPC |
| Authorized review RPC | Exactly one audit event + source status change, same transaction |
| Malformed decision/rationale | Client and SQL both reject |
| Wrong institution evidence | Rejected, unchanged source/audit |
| Concurrent decisions | One accepted, other stale with no duplicate event |
| University publication | Always blocked by existing publishing CHECK |
| Migration ledger | Reconciled with authoritative Lovable runner, no fabricated rows |

This frontend PR is not evidence of a released review engine or verified university. University accreditation or scholarship recognition must be independently established using appropriate official authorities, not the `reviewed` flag alone.
