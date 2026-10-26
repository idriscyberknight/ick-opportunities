# ICK Opportunities — A1.8 Phase 4.5: Evidence-based blocker resolution and proposed staging migration contract

**Date:** 2026-10-26  
**Status:** READ-ONLY FINDINGS + DESIGN REVIEW. **No DDL, data writes, migrations, test accounts, deployment or merge authorized.**  
**Parent:** Draft PR #40, issue #35. Previous A1.8 proof in `tests/a18/db_isolated_security.sql` uses simulated claims, not signed JWTs.

## 1. Resolved discrepancy: EXACT table drift (VERIFIED)

Two different Lovable Cloud project bindings were queried through their separate connected project IDs. Metadata-only `information_schema.tables` inventories prove that the **sole** additional Production public base table is:

> **`public.university_review_events` — present in Production, absent in Security Staging.**

- Production: 19 public base tables, PostgreSQL **17.6**.
- Security Staging: 18 public base tables, PostgreSQL **17.11**.
- All other 18 public base-table names match at the time of comparison.
- **Alert dependency parity:** the ordered `information_schema.columns` catalog **including defaults, types, nullability** for `opportunities`, `profiles`, `saved_opportunities` has matching metadata MD5 fingerprint in both environments: `9c4ddde2aaf8ed89836c4cf68ad80357`.
- **Existing policy parity:** ordered `pg_policies` metadata (policy name, command, roles, predicate, WITH CHECK) for those same three tables has matching fingerprint `ebfe9ea632061216fe910065086ddb54`.
- All three relevant tables show `relrowsecurity = true` in both environments. The three relevant enums (`opportunity_category`, `opportunity_status`, `verified_status`) match by observed labels/order.
- **Important:** matching MD5 metadata fingerprints do **not** prove full schema equivalence, privileges, runtime exposure, signature authorization, constraints/indexes, backups or deployment mapping.
- `university_review_events` is not an existing direct prerequisite for the proposed A1.8 tables. **Do not migrate, recreate, remove, or copy it** as part of the unrelated alerts project.

**Disposition:** original "unknown extra table" question is **RESOLVED**. A broad complete-environment schema parity assertion remains **UNSUPPORTED**.

## 2. New high-priority issue: migration-ledger mismatch (VERIFIED)

A read-only `to_regclass('supabase_migrations.schema_migrations')` presence check found:

| Environment | Existing Supabase migrations ledger relation |
| --- | --- |
| Production | **Present** |
| Security Staging | **Absent** |

This is relevant to *how* a proposed migration could be tracked and applied, even though alert dependencies align. The absence of this relation does **not** prove how Lovable internally tracks every migration or that staging has no migration system. **Do not fabricate/create a migration ledger**, do not point the separate personal Supabase connector at this Cloud backend, and do not place an automatically run migration in `supabase/migrations` before verifying the actual Lovable execution path.

**Required gate:** identify a specific staging-only change mechanism and get its owner/rollback behavior independently confirmed. An untracked direct Cloud SQL execution requires an explicit evidence log and separate Founder permission.

## 3. High-priority metadata confidentiality — recommended design decision

The existing prototype grants authenticated users `SELECT` on entire `public.user_notifications` rows and uses owner-only RLS. That does **not** prevent an owner from reading their own `event_key` or `opportunity_id` over direct REST after a linked opportunity is unpublished or revoked. The frontend's `visibleOpportunity=null` masks the display only; it cannot close the direct API exposure.

**Preferred candidate for staging review: fail-closed dual gate + column-specific grants**

1. Keep the physical `user_notifications` table server-created and owner-addressed; `UNIQUE(user_id,event_key)` stays internal.
2. The authenticated user's **SELECT and UPDATE RLS policies** must require **both** the row's `user_id = (SELECT auth.uid())` **and** a currently public/eligible referenced `opportunities` row (active, verified, reviewed, `published_at <= now()`, and unexpired deadline). The extra explicit public predicate prevents a privileged/admin opportunity SELECT policy from broadening this visibility.
3. Optionally require the owner's alert preference to remain enabled so opt-out suppresses inbox responses; settle historical inbox retention/opt-out semantics in the product spec.
4. Explicitly revoke default grants then grant only **column SELECT** needed by the inbox: `id`, `kind`, `opportunity_id`, `created_at`, `read_at`, `dismissed_at`. **Do not expose `event_key` or `user_id`** via the direct client row contract.
5. Grant only `UPDATE(read_at, dismissed_at)`; disable browser INSERT/DELETE on notifications, guard unwanted timestamp revisions in reviewed DB logic, test all effective privileges, including inherited/default grants and any RPC.
6. Let the UI separately retrieve opportunity titles through the existing public gate. If row is no longer public, neither notification metadata nor the opportunity title should be accessible from the direct user-scoped API.
7. Delivery worker (if later approved) is a separate trusted component; must revalidate consent, publication, dedupe, rate limits and kill switch at write time. **No backend worker or scheduler is part of PR #40.**

**NON-EXECUTABLE POLICY DESIGN SKETCH (review semantics only, not SQL to run):**

```text
ALLOW user_notifications SELECT/UPDATE only when:
  auth.uid() IS NOT NULL
  AND row.user_id = auth.uid()
  AND EXISTS (
    public.opportunities row with row.id = notification.opportunity_id
    AND status = 'active'
    AND verified_status = 'verified'
    AND reviewed_at IS NOT NULL
    AND reviewed_by IS NOT NULL
    AND published_at IS NOT NULL AND published_at <= now()
    AND (deadline IS NULL OR deadline >= CURRENT_DATE)
  )
  [possibly AND owner preference remains enabled, pending UX decision]

Client-readable notification columns:
  id, kind, opportunity_id, created_at, read_at, dismissed_at
Not exposed in user-facing SELECT:
  user_id, event_key
Client-changeable notification columns:
  read_at, dismissed_at only, with trusted timestamp normalization
```

**Do not claim the sketch is tested**. This is an architecture proposal, not a vetted executable policy; a future staging-only SQL migration must be reviewed for query semantics and RLS recursion/permission behavior.

## 4. Preference input and integrity contract

- `enabled` defaults to **false** and a missing preference row also means OFF.
- User changes require explicit, authenticated Save, server confirmation and read-back. Visiting the preview or editing controls is **not consent**.
- Prefer column-specific INSERT/UPDATE grants so browser clients **cannot set `updated_at` arbitrarily**. A trusted timestamping mechanism must handle the timestamp if accuracy is required.
- Authenticated users may manage only preferences owned by their own `auth.uid()`; all UPDATEs require `USING` and `WITH CHECK`; anon denied.
- Browser camelCase-to-SQL mapping: `newMatchesEnabled → new_matches_enabled`, `savedDeadlineRemindersEnabled → saved_deadlines_enabled`, `minimumMatchScore → minimum_match_score`, `deadlineLeadDays → deadline_lead_days`. Timezone requires an explicit product contract; validate a real accepted IANA timezone in trusted backend, not regex alone.
- Storage constraints must reject malformed category arrays, lead days and match thresholds. Deleting a preference or saving `enabled=false` must behave as opt-out.

## 5. Recovery/restore gate — documented feature vs verified project state

Official Lovable Cloud documentation describes **daily database backups** with roughly **14 days of retention** and a Database → Backups screen. It states that **Restore is destructive**, reverting **schema and data**, dropping changes made after the backup; backups do **not** cover Cloud Storage files.

This documentation proves a vendor capability, **not** that this specific Security Staging project has a suitable recent snapshot or a tested restoration pathway. Before any staging DDL:

1. Open **ICK Opportunities - Security Staging** in Lovable, choose **Cloud → Database → Backups**, and verify the latest usable backup **timestamp**. Do **not** press **Restore**.
2. Confirm the backup applies to the **staging project**, not the Production project, and document consequences for any staging-only changes after the snapshot.
3. Produce a rollback/restore rehearsal plan with full SQL dependency inventory and a tested way to recover; vendor docs alone are not a completed restore drill.
4. Preserve immutable human approval and exact target/project identification; separate Production migration would require a new decision, not the staging approval.

Source: https://docs.lovable.dev/features/database (Backup and restore).

## 6. Updated readiness gate

| Gate | Status | Evidence/action |
| --- | --- | --- |
| Separate Cloud projects/URLs | **VERIFIED** | Distinct existing Lovable project IDs and URLs, metadata queries against each. |
| Exact public-table drift | **RESOLVED** | Production-only `public.university_review_events`. |
| A1.8 dependency columns and policies | **MATCHED in observed metadata** | Two matching MD5 catalog fingerprints; RLS and enum labels verified. |
| Default-grants risk | **OPEN** | Broad default ACL observed in both; future reviewed migration must revoke/assert least privilege. |
| Migration execution path and ledger | **BLOCKED** | Production ledger present, staging ledger absent; determine authoritative runner/approval mechanism. |
| Actual staging backup snapshot | **NOT VERIFIED** | Vendor supports backups; project-specific timestamp/restore plan unproven. |
| Revised notification RLS and grants | **PROPOSED, NOT IMPLEMENTED** | Must be embodied in reviewed staging-only SQL and adversarially tested. |
| Real signed-JWT A/B/anon REST tests | **NOT RUN** | Cannot prove against absent alert tables. |
| User-facing Save/opt-in adapters | **NOT IMPLEMENTED** | Preview remains read-only; default OFF. |
| Live notifications/Production DDL | **NOT AUTHORIZED** | Separate Founder approval gates remain. |

## 7. Final disposition

**A1.8 Phase 4.5 finding:** two read-only blockers were resolved (name of extra Production table and alert dependency parity). A new material deployment finding emerged (migration-ledger mismatch), and no actual staging backup snapshot or real-JWT RLS proof exists. **NO-GO** for Staging DDL today.

### Safe next work
- Prepare revised, isolated, **non-migration-path** SQL design proposal for review with explicit privilege assertions and target safeguards.
- Confirm current staging backup and Lovable's supported staging change pathway.
- Obtain **specific Founder approval for precisely reviewed staging SQL only** after evidence and rollback are ready.
- Require a *different* later approval for any Production DDL, PR merge, jobs, email/SMS/push, or live launch.

**Actions performed for this finding: schema-metadata SELECT reads and GitHub Draft PR documentation only. No Production or Staging mutations.**
