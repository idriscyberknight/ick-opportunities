# ICK Opportunities — A1.6.2 Secure Editorial Review & Approval (RFC)

**Date:** 2026-10-25
**Status:** DESIGN ONLY / production changes not authorized by this RFC
**Authoritative backend:** ICK Opportunities Lovable Cloud Production, NOT a separate personal Supabase project.
**Product principle:** Truth before publication. Review of an institution, an educational programme, an Islamic identity, a regulator claim, and a scholarship are distinct factual decisions.

## 1. Verified prerequisite milestones

- A1.5: four registry tables, 12 authenticated Admin-only RLS policies, fail-closed publication CHECK; draft creation, readback, mobile editing, test cleanup and Normal User UI denial passed.
- A1.5: real signed Normal User PostgREST INSERT against all four tables denied with SQLSTATE `42501`, independently followed by zero-row Production readback. Empty-table SELECT returned zero but **did not** establish isolation with nonempty private data.
- A1.6.1: Source Checklist and evidence-first workflow merged in PR #25, deployed to Vercel Production at commit `bd811d8c2000d19aa72f2cd91fba8cf3e4c4560a`; Founder reports the browser UI works. Checklist is informational; NO automatic verification or publishing.
- **2026-10-25 Production read-only column privilege query:** `has_column_privilege('authenticated', <table>, <sensitive-column>, 'UPDATE') = true` for *all ten protected review-state fields*: `universities.verification_status`, `reviewed_by`, `reviewed_at`, `publication_status`, `published_at`; `university_evidence.review_status`, `checked_by`, `checked_at`, `visibility`; `university_classifications.review_status`. The `anon` role has no table-level UPDATE grants on these tables.
- This is an **editorial-integrity gap for authorized Admins**, not proof that an ordinary Normal User can update any row: the existing RLS still limits access to Admins. An Admin could currently bypass client-only review process through an authorized direct table UPDATE; `universities_no_publishing_yet` still prevents actual `published` status.
- **Migration state:** historical C5 migration is not tracked in the observed ledger; initial registry schema was installed by Founder-approved direct SQL and is not in the ledger. Do NOT replay historic DDL, run `db push`, repair history, alter grants or deploy proposed SQL without an approved and audited adoption procedure.

## 2. Threat model and prioritized goals

**Actors:** unauthenticated visitor, signed Normal User, Admin who collects draft facts, authorized editorial reviewer, compromised/stale Admin session, service/background workers. Currently only `admin` is an established application role for this registry. Reviewer and publisher roles **do not yet exist** and must not be invented as live privileges.

**A1.6.2 objective:** implement an **internal, source-specific review decision** that writes a durable actor/time/decision event and corresponding checked status in **one database transaction**. The UI must not be able to mark sources reviewed or institutions verified by direct mutation of privilege-bearing fields. **No public publication in this phase.**

**P1:** remove bypasses by the existing authenticated Admin role's direct UPDATE grants to review-state columns when the reviewed atomic RPC is ready. RLS alone checks *who* may update, not *which editorial transitions* an Admin can perform.

**P2:** enforce actor-from-session, independent evidence, timestamp, reason and concurrency invariants server-side, not only in React. Fail closed on unknown role, stale evidence, mismatched institution or missing source.

**P3:** link decisions to append-only events protected against edits/deletes by all client-facing roles. Describe them as **application-role append-only**, not impossible for a database owner to alter.

## 3. Proposed release slices — no production changes yet

### A1.6.2a — Source review (first proposed migration)

1. Confirm exact Production column, RLS, function ACL, triggers, existing migration runner and backup/recovery baseline, then adopt a no-replay migration path.
2. Add a dedicated `university_review_events` table with UUID primary key, institution ID, optional evidence/classification ID, event type and decision (constrained vocabulary), statement of claim, human-readable nonblank reason, reviewer ID from `auth.uid()`, event timestamp **database-generated**, prior/new status, revision/token, evidence URL/fingerprint where appropriate. Narrow CHECK/FK constraints. Avoid putting credentials, copies of personal documents or unlicensed source text in logs.
3. Enable RLS; explicitly revoke DEFAULT `PUBLIC`, `anon` and `authenticated` INSERT/UPDATE/DELETE privileges on events; allow only authorized Admin SELECT via RLS. Define **no** client insert/update/delete policy for events.
4. Introduce an **atomic, narrowly scoped PostgreSQL RPC** for `pending_review -> reviewed|rejected` evidence transitions: `SECURITY DEFINER` **only if required** to write append-only events and protected review columns; `SET search_path = ''`, qualify objects, revoke `EXECUTE` from `PUBLIC, anon` and grant `EXECUTE` only to `authenticated`; independently validate `auth.uid()` and `public.has_role(auth.uid(), 'admin'::public.app_role)` **inside** the function. Use `SELECT ... FOR UPDATE` / optimistic revision checks; establish the source belongs to the target institution; block reviewed claim without explicit reason, claim-specific source validation and current-meaning check. Derive actor/time inside SQL. Create event and update source status in one transaction; rollback both on failure.
5. **Same reviewed migration transaction:** revoke broad table-level `UPDATE` on registry data from `authenticated`, re-grant only the allowlisted draft-editable columns actually required by existing A1.5 form. Never leave a temporary state that allows a direct Admin bypass. Preserve `SELECT`, `INSERT` and Admin RLS as needed. Revoke all direct `UPDATE` for review-only child-state tables unless independently necessary. Inspect table grants and PostgreSQL column grants together; ensure a broad table grant cannot override sensitive-column restrictions.
6. Confirm a direct Admin `PATCH review_status='reviewed'` is rejected (by SQL privilege), while an authorized reviewed RPC creates exactly one event plus matching source state.
7. Make an Admin-only `Review source` interface only **after** backend acceptance; show authority, claim, URL, current status, full evidence and human rationale. A hyperlink or HTTPS alone never confers verification.

### A1.6.2b — Classification and institutional verification (separate approval)

- Require an existing reviewed **same-university** evidence row for classification review; current composite FK ensures same university, but **does not** ensure its review status.
- Islamic-institution status requires official charter/mission/governance evidence; Islamic-studies-provider requires official course/department evidence. They are independent labels; neither follows from Arabic name or geography.
- A university becomes `verified` **for internal editorial purposes only** after specific current authority evidence and identity/website corroboration are reviewed; store all underlying decisions and reviewer rationale as immutable application-level audit events. A verified institution is **not** an accredited programme or a verified scholarship.
- Rejected/revoked/expired evidence invalidates dependent decisions; re-review must create new audit events, not rewrite old records.
- Prevent direct `verification_status='verified'` API writes even by Admin outside narrowly scoped RPC.

### A1.6.3 — Publication (out of scope here)

- No removal of `universities_no_publishing_yet` in A1.6.2.
- No public SELECT for university registry or public import of 8 static starter entries.
- Publication requires distinct Founder decision, authority-specific claim review, transactionally enforced approval/revocation, independent public-read RLS, published snapshot, rollback and monitoring.

## 4. Proposed security-function contract (design, NOT SQL to execute)

`review_university_evidence(p_evidence_id uuid, p_decision text, p_reason text, p_expected_state text)`:

- Input is evidence ID, decision and reason plus expected state. It **does not accept the actor ID, timestamp, university ID, or a caller-supplied `is_admin` flag** as trusted values.
- Check active signed session and internal admin role on every call.
- Resolve row, lock it, and reject mismatched expected/current state; no silent overwrites.
- Reject missing source, expired/disputed/unchecked facts, and dangerous/untrusted URLs; validate authority manually (not from URL shape).
- Insert immutable event capturing before/after and reason; update reviewed metadata only if matching event was created.
- Use SQL transaction atomicity, never JS `update()` then `insert()`. On any exception both changes roll back.
- Return minimal result ID/status; no service keys, JWT or private source content in response.
- RPC execution restrictions plus explicit in-function authorization are both mandatory.
- Peer check of security context, `pg_proc.prosecdef`, owner, search path and grant inheritance before merge.

## 5. Required negative and positive acceptance

| Test | Expected evidence |
| --- | --- |
| Anonymous SELECT/POST/PATCH on review events and registry | Denied, no private rows returned |
| Real Normal User JWT, including against a **nonempty** Admin draft | Zero private rows; direct INSERT/PATCH denied; no audit events |
| Admin direct PATCH to review-status columns | Denied despite being Admin |
| Admin draft edit of allowlisted safe columns | Still functions (no A1.5 regression) |
| Admin review RPC with unchecked/mismatched source | Rejected; no event or status change |
| Admin review RPC with valid reviewed source | Exactly one matching decision event and status change atomically |
| Missing reason or client-supplied fake reviewed_by | Rejected / ignored |
| Two simultaneous conflicting reviews | Exactly one accepted; other conflict with no extra event |
| Forced failure after event append or before status update | Full transaction rollback |
| Review event direct UPDATE/DELETE as any app role | Denied |
| Classification based on rejected/unreviewed source | Cannot be approved |
| Attempt to publish any university | Database publication CHECK rejects |
| Source revocation or stale regulator record | Validity risk flagged; previous decisions retained and future publication blocked |
| Backup / migration recovery rehearsal | Validated before Production execution |

These tests must run in controlled isolated environment first. Founder-approved Production proof must preserve non-sensitive audit evidence and clean up only a specifically scoped fixture; never use blanket DELETE/TRUNCATE.

## 6. Governance and delivery gates

1. **Architecture review:** verify this contract, relevant national regulators, evidence and source licensing, current Production schema fingerprint.
2. **Migration reconciliation:** agree on authoritative Lovable schema-change runner; existing registry was installed directly, and current `supabase_migrations` ledger differs from repo. No manual ledger fabrication.
3. **Atomic DDL/RPC PR:** separate from this RFC, with reviewed grants, function source, migration comments, comprehensive isolated DB tests, rollback and type regeneration.
4. **Frontend PR:** only after backend authorization and audit guarantees pass, including real-jwt negative tests.
5. **Production rollout:** distinct Founder approval of SQL/change set; backup/recovery verification; no change to public publication.
6. **Post-deploy:** count no unexpected rows, verify audit immutability for app roles, existing Admin draft flow and real signed Normal User denial; report unknowns separately.

## 7. Primary technical references

- Supabase official database functions/security: https://supabase.com/docs/guides/database/functions
- Supabase RLS and security definer behavior: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase API privileges and default function grants: https://supabase.com/docs/guides/api/securing-your-api
- Lovable migration/run history and Git sync behavior: see `docs/database/ICK_A15_MIGRATION_RECONCILIATION_FINDINGS_2026-10-25.md`
- Previously approved global university evidence hierarchy: `docs/universities/ICK_A16_GLOBAL_UNIVERSITY_VERIFICATION_WORKFLOW_2026-10-25.md`

**Truth boundary:** This RFC identifies a real Production *privilege-design gap for authorized Admin review fields* and proposes a remediation. It is **not** proof of a Normal User authorization bypass, and no database schema, permissions, code, roles, publication or production deployment were modified in A1.6.2 by this RFC.


## 8. Follow-up release readiness snapshot (2026-10-25, read-only)

**Founder visual acceptance:** Founder opened the A1.6.2 Admin frontend preview from Draft PR #28 and confirmed they could see it. This is **visual confirmation**, not proof that an editorial decision was submitted; the UI deliberately keeps review submission disabled until backend release.

**Independent current Lovable Cloud Production SQL readback** (aggregates only; no personal records, domains or credentials retrieved):

| Check | Current value |
| --- | --- |
| Registered university drafts | 1 |
| Institution verification pending | 1 |
| Published registry records | 0 |
| Attached aliases | 1 |
| Attached evidence | 1 (`pending_review`) |
| Evidence reviewed/rejected | 0 / 0 |
| Classifications | 0 |
| University registry RLS-enabled tables | 4 |
| University registry Admin policies | 12 |
| Fail-closed publishing constraint | 1 |
| `ick_a16_review_evidence` Production RPC | 0 |
| `university_review_events` Production audit table | absent |
| `supabase_migrations.schema_migrations` rows | 13 |
| Latest legacy migration version | `20261005021810` |
| `20261008100000` C5 migration ledger entry | 0 |

**Important change since prior tests:** an actual private university draft, a name alias and an unreviewed evidence row are now present. Do not delete, rename, approve or publish these records as a side effect of acceptance testing or migration reconciliation. Presence of source records does not establish real-world legitimacy.

**Connected Lovable project source SHA:** `bd811d8c2000d19aa72f2cd91fba8cf3e4c4560a`, matching the deployed Production A1.6.1 baseline. GitHub PR #26 (this RFC), PR #27 (isolated SQL prototype), and PR #28 (fail-closed frontend integration) remain distinct draft PRs. No one has approved a Production database change through them.

### Documented Lovable migration and backup constraints

- Lovable's official database documentation confirms that changes made by Lovable in project chat generate migration files; modern files are under `drizzle/migrations/` and older projects may have `supabase/migrations/`. This project's checked legacy source has 14 `supabase/migrations/` files; a direct SQL editor change is **not** proven tracked by that history.
- Lovable's Git sync documentation explicitly states that syncing a Git commit **does not execute new database migration files**. Thus an isolated test SQL file under `tests/a16/` is NEVER a Production migration just because its pull request is merged. Do not move the prototype directly into the existing migrations folder and assume replay safety.
- Lovable documents **daily backups**, generally with approximately 14-day retention, managed in `More → Database → Manage → Backups`. This is a **platform statement, not project-specific verification** of the most recent usable backup. Backups taken before October 25's new registry schema may not protect the current state.
- For an exact pre-migration recovery point, Lovable also documents the `More → Database → Manage → Settings → Export project data` workflow. A full database export includes authentication records and **password hashes**; treat the export as highly confidential, never commit it or share it in a chat. Lovable saves the export to project storage pending download. Storage files are not included in the database backup.
- Restoring an old backup can destroy all later user data **and** revert schema, so actual recovery requires a separately approved rehearsal/rollback plan. **Do not click Restore to this backup** during readiness checks.

Sources:
- https://docs.lovable.dev/features/database
- https://docs.lovable.dev/integrations/git-sync-overview
- https://docs.lovable.dev/features/database-backups
- https://supabase.com/kb/troubleshooting/cant-access-supabase-project-lovable-cloud

### Strict next production gate

**HOLD all A1.6.2 SQL writes** until (a) project-specific backup list has been inspected; (b) recent full export / recovery strategy is confirmed; (c) historical migration mismatch is reconciled with the actual Lovable owner/runner; (d) SQL privileges, identity-lock trigger and all lifecycle transitions pass an isolated production-shaped rehearsal; (e) PR #28's safe Admin draft PATCH regression is validated; (f) Founder explicitly approves the reviewed exact Production SQL; and (g) post-migration real JWT tests on controlled nonempty fixtures have a zero-leakage cleanup and rollback strategy.

No Production writes, SQL DDL, role changes, database exports or backup restores were executed as part of this read-only snapshot.


## 9. Founder-observed Lovable backup timestamps and restoration risk (2026-10-25)

**Evidence:** Founder supplied an Android screenshot from `More → Database → Manage → Backups`. Entries visibly listed (UTC):
- **Oct 25, 2026 — 02:16:10**
- Oct 24, 2026 — 02:16:31
- Oct 23, 2026 — 02:14:51
- Oct 22, 2026 — 03:28:34
- Oct 21, 2026 — 02:18:23
- Oct 20, 2026 — 02:19:23

The checkmarks and available Restore buttons demonstrate that the Lovable UI lists these **daily restore points**. **No restore or recovery rehearsal was performed.** The UI alone does not prove that the user personally tested recovering these snapshots.

**Independent read-only Lovable Cloud Production readback after screenshot:**
- Earliest/current university draft created **2026-10-25 12:49:43.326127+00**; 1 draft.
- Alias created **2026-10-25 12:50:02.798275+00**; 1 alias.
- Attached evidence created **2026-10-25 12:51:45.950201+00**; 1 source.
- Classifications 0, publication guard 1, A1.6.2 RPC absent.

**CRITICAL RECOVERY GAP:** The latest listed backup **2026-10-25 02:16:10 UTC** predates all three current registry rows by more than ten hours. Restoring that snapshot would necessarily remove those three rows, and may revert schema that was modified after the backup. Never restore the October 25 snapshot as the "current" A1.6.2 release checkpoint. The exact creation time of the four registry tables relative to this snapshot is not independently established from these checks, so do not assert they are definitely absent in the snapshot.

**Release decision:** `Backup inventory visible = PASS`; `A1.6.2 current-state recovery checkpoint = NOT READY`. Before any Production DDL/migration approval, secure a **new post-12:51:45 UTC** daily backup or an independently controlled, verified full export capturing the current database state. The user previously said they had exported data, but the date/scope/restore-readiness of that export has NOT been verified and cannot substitute without checking. Do not export secrets into a public GitHub PR or ask for a database file or screenshot containing credentials/user information.

Lovable's current docs confirm daily UTC backups, restoring loses all subsequent DB edits and can revert schema, database export includes account password hashes, and database backups omit storage files: https://docs.lovable.dev/features/database-backups.

**No database/data/settings/backup changes were performed.** This log contains only timestamps and aggregate counts, not private university data, credentials, tokens, or source URLs.
