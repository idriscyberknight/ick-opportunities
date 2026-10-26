# ICK Opportunities — A1.8 Phase 4.4: Final Schema Design Review & Release Gate

**Review date:** 2026-10-26  
**Disposition:** **CHANGES REQUIRED / NO-GO FOR STAGING DDL**.  
**Scope:** Review-only critique of `design/a18/alert_schema_prototype.sql`, existing A1.8 candidate generation, Phase 3 UI and evidence captured under Draft PR #40. **No SQL was executed by this document.**

## Decision summary

The initial schema is a useful isolated prototype with default-OFF consent, per-user RLS, explicit REVOKEs and uniqueness. Its own CI verifies simulated SQL roles only. It must **not** be installed unchanged into either Lovable database: outstanding confidentiality, write-integrity, lifecycle, deployment, signed-JWT and recovery questions remain.

**Evidence:**
- Lovable Security Staging: PostgreSQL 17.11; 18 public base tables; expected enum, auth helpers, key related tables and published-only opportunity SELECT policy were observed; both alert tables absent.
- Lovable Production: PostgreSQL 17.6; 19 public base tables; same essential dependencies and public opportunity visibility policy; both alert tables absent. **Later Phase 4.5 update:** full public-table name inventory was obtained; the only Production-only base table is `public.university_review_events`.
- Separate Lovable `.env` Supabase URL and project ID for Staging versus Production; this reduces but does not eliminate risk of a misplaced migration.
- Security Staging's existing **application code** is behind Production GitHub main; in particular the new Phase 3 alert UI components and schema prototype are absent from that staging project's file tree.

## Findings requiring resolution

| Severity | Finding | Why it matters | Required design action |
| --- | --- | --- | --- |
| **HIGH** | `GRANT SELECT ON public.user_notifications TO authenticated` permits an owner to read all columns of their notification rows, including `event_key` and `opportunity_id`. | UI rendering `visibleOpportunity=null` cannot prevent direct REST reads of structured metadata relating to a subsequently private/unpublished opportunity. | Set a reviewed API data contract: avoid unnecessary direct raw-table SELECT; design a least-privilege projection/server endpoint that does not reveal revoked opportunity data. Evaluate row and column grants and verify real REST denial. |
| **HIGH** | Broad default ACLs for new public tables are still observed in both Lovable environments. | Forgetting to revoke privileges on new objects can expose them at the privilege layer even with other protections. | Assert *effective* `anon` and `authenticated` table/column grants after transaction; explicit REVOKEs and reviewed GRANTs. Global default ACL remediation belongs to its own approved change. |
| **HIGH** | The schema has no real signed-JWT A/B/anon PostgREST test evidence. | The disposable PostgreSQL 16 fixture simulates session identity but does not prove production API security or real auth flows. | After separate staging-DDL approval, execute isolated genuine signed-user test matrix and record HTTP result classes, role owner scoping, and negative tests without exporting tokens. |
| **HIGH** | Migration-runner targeting and Staging rollback/restore path are not yet verified. | Git branches and Vercel previews do not clone database data; accidental production SQL would be harmful. | Verify exact Lovable-hosted target, migration mechanism, preflight guard, backup/reprovision and repeatability *before* staging DDL approval. |
| **MEDIUM** | `GRANT ... UPDATE` on all `alert_preferences` columns allows the owner to set `updated_at` directly; notification timestamp columns can be set to arbitrary values. | Timestamps should not be treated as reliable server audit facts if user-controlled. | Prefer column-specific UPDATE grants and server-maintained audit timestamps; decide allowed read/dismiss transitions. Test boundary values and immutable keys. |
| **MEDIUM** | `timezone` only has a format regex, and no equivalent current frontend preference field. | An invalid IANA zone may pass SQL shape checking and cause wrong reminder day calculations. | Validate timezone identity on trusted input; document a UTC default and intentional preference selection or server-owned validation. |
| **MEDIUM** | A DB row with `enabled=true` alone has no durable consent receipt or backend consent recheck. | Saving a preference is not identical to approved notification generation; account switching/revocation may race workers. | Design explicit user Save/confirmed read-back, opt-out effective immediately, consent-state audit policy and transactional backend recheck before storing a notification. |
| **MEDIUM** | The public opportunity SELECT policy uses database `CURRENT_DATE`, while candidate logic accepts a caller's validated local date. | Different timezone/date boundaries can give inconsistent visibility or reminders. | Define source-of-truth policy for deadlines and consistent timezone handling; never override publication/review/verification requirements based on client data. |
| **MEDIUM** | `user_notifications` rows remain when an opportunity is unpublished (FK cascades on deletion only). | Stale link content or raw metadata can survive a publication rollback. | Require fresh public-visible projection for display and tested redaction/revocation behavior across all data surfaces. |
| **MEDIUM** | Frontend camelCase to SQL snake_case mapping and generated DB types are not implemented. | A prototype form can mislead about stored preference state. | Create a typed adapter only after approved schema and real account-scoped save/read-back tests. Keep preview read-only. |
| **LOW / Resolved** | Production has one more public base table than Security Staging: `public.university_review_events`. | It is not a direct A1.8 schema prerequisite; full environment parity remains unproven. | Relevant alert dependency metadata/policy fingerprints have been independently matched in Phase 4.5; review migration ledger divergence separately. |

### Additional mandatory validation

- Confirm `REVOKE ALL` really excludes table-level and inherited updates on notification identity fields (`user_id`, `event_key`, `opportunity_id`, `kind`, `created_at`), and that the data API exposes no alternate privileged RPC.
- Test that invalid duplicate categories, NULL array members, duplicate reminder windows and out-of-range match scores are rejected through a real API.
- Confirm `alert_preferences` row deletion means opt-out rather than a silent reset to enabled; disabled users must not receive newly generated alerts.
- Confirm unique `(user_id,event_key)` on notification storage works under concurrent delivery, and design retention/rate limits/failure metrics and a kill switch before an actual worker.
- The signed-in admin SELECT policy on `opportunities` can view private rows. A backend using elevated access **must explicitly enforce public eligibility** rather than merely inherit an elevated/admin dataset.
- Review whether identities created for testing will incur cost or persist data; do not create test accounts without separate authorization.

## Recommended design changes — proposal, NOT implemented

1. Define **an API-safe notification view model first**: notification `id`, `kind`, `createdAt`, `readAt`, `dismissedAt`, and `visibleOpportunity` *only when publication is currently valid*. Choose and threat-model one controlled server response or security-invoker projection design with the necessary grants, including direct REST bypass tests.
2. Prefer **explicit column-level `UPDATE`** for editable preference fields, with `updated_at` maintained by trusted DB logic, and explicit least-privilege grants for notification mark-read/dismiss.
3. Preserve fail-closed **`enabled=false` by default**; treat missing preference row as disabled. Keep frontend `readOnly=true` until secure Save, verified consent and owner-scoped persistence are actually ready.
4. Use a **separate staging-only** migration/design branch *after* the read-only inventory, exact runner, backup plan and schema review are complete. Do not place an auto-runnable migration on main.
5. Require explicit, separate Founder authorization for **Staging DDL** after the reviewed exact SQL/target/rollback has been presented; Production SQL and alert delivery require new later approvals.

## Read-only query to resolve remaining Production table-count discrepancy

Use solely on the verified Production Lovable Cloud connection after MCP rate limit lifts; compare *returned names*, not only counts, with already captured Staging names:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Status update:** this exact read-only query later succeeded; see `ICK_A18_PHASE4_5_BLOCKER_RESOLUTION_2026-10-26.md`. Never infer schema presence from a branch, generated TypeScript declarations, or a screenshot.

## Evidence quality

- **Verified via connected Lovable read-only query/config:** distinct backing API URLs/IDs, presence/absence of essential tables, relevant published-opportunity RLS policies, Staging full inventory, creator default privilege exposure and server versions.
- **Verified via repository inspection:** prototype SQL, simulated-claim isolated tests, Phase 3 read-only preview behavior, staging code snapshot missing new alert UI.
- **Not verified:** extra Production table's name, deployment runner, recovery rehearsal, schema migration applied to Staging, real Supabase signed-token A/B/anon data API isolation, secure metadata projection, active consent persistence/delivery.
- **Not done:** merge PR #40, Staging/Production SQL write, new live users, production release, notification scheduling, email/SMS/push.

**Decision: NO-GO for SQL execution as of this review.** Documentation-only work may be merged after separate review, but would not authorize either database mutation.
