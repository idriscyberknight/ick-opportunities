# C5 — Tighten database privileges: findings, risk analysis, plan, rollback and testing

Scope: roadmap item C5 only. Evidence: live database (SELECT-only queries, 8 Oct 2026) and this repository at main 38f4097. C5 changes no application code, RLS policy, table or column.

## 1. What was read (all read-only)

- Live database: table, column, default, function, sequence and schema privileges; the 24 RLS policies; role flags; cron job shape; server version (PostgreSQL 17.6; the migration runner and every table owner is postgres).
- Repository: the migrations that create tables or grants, plus saved.ts, tracking.ts, profile.ts, review.ts, discovery-admin.ts and discovery-core.server.ts, and code searches for every .from(, .delete() and user_roles use under src/.

## 2. Findings vs the onboarding report

| Report claim | Verdict | Evidence (VERIFIED live) |
|---|---|---|
| anon holds SELECT and INSERT on all 14 tables | Confirmed, understated | anon holds ALL eight privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) on all 14 tables |
| authenticated holds UPDATE on 13 of 14 | Confirmed, understated | ALL on 13 tables. On discovery_settings: table-level DELETE, INSERT, TRUNCATE, TRIGGER, REFERENCES, MAINTAIN, plus column-level SELECT (id, scheduled_enabled, lock_until, updated_at) and UPDATE (scheduled_enabled, updated_at) |
| anon can read cron_token at privilege level | Confirmed | anon holds table-level SELECT on discovery_settings. Migration 20261002002842 removed the table grant from authenticated and whitelisted columns, but never touched anon. RLS returns anon no rows today because only admin policies exist |
| Default grants are wide open | Confirmed, root cause | pg_default_acl for postgres (and supabase_admin) in schema public grants ALL on tables, ALL on sequences and EXECUTE on functions to anon and authenticated. The explicit GRANTs in the migrations are additive, so they never narrowed anything |
| (new) TRUNCATE | New finding | anon and authenticated hold TRUNCATE on every table; TRUNCATE is not subject to RLS. PostgREST does not expose it (ASSUMPTION about the API surface), so not exploitable via the API, but RLS cannot contain it |

VERIFIED unchanged and fine: RLS is enabled on 14 of 14 tables with 24 policies; has_role is executable only by authenticated and service_role; handle_new_user and set_updated_at are not executable by clients; no sequences exist; anon and authenticated lack CREATE on schema public.

Exploitability today: no path through the public API was found. This is a defence-in-depth gap: one wrong future policy would expose data or writes.

## 3. Exactly which grants are unnecessary

Rule: keep what the original migrations granted explicitly (the design intent), cross-checked against code; remove everything else. Unused-but-designed privileges (UPDATE on three user tables) are kept to avoid breaking future features.

| Table | anon keeps | authenticated keeps | Evidence |
|---|---|---|---|
| opportunities | SELECT | SELECT, INSERT, UPDATE, DELETE | public pages; admin CRUD |
| profiles | none | SELECT, INSERT, UPDATE | upsert in saveProfile; never deleted |
| user_opportunity_preferences | none | SELECT, INSERT, UPDATE, DELETE | delete + insert on save |
| skills | none | SELECT, INSERT | select + insert new skill only |
| user_skills | none | SELECT, INSERT, UPDATE, DELETE | delete + insert on save |
| user_interests | none | SELECT, INSERT, UPDATE, DELETE | delete + insert on save |
| user_roles | none | SELECT | isCurrentUserAdmin read; no write policy |
| saved_opportunities | none | SELECT, INSERT, DELETE | saved.ts |
| application_tracking | none | SELECT, INSERT, UPDATE, DELETE | tracking.ts |
| opportunity_sources | none | SELECT, INSERT, UPDATE, DELETE | review.ts, discovery |
| opportunity_audit_logs | none | SELECT, INSERT | append-only |
| discovery_settings | none | column SELECT (id, scheduled_enabled, lock_until, updated_at); column UPDATE (scheduled_enabled, updated_at) | cron_token excluded |
| discovery_runs | none | SELECT, INSERT, UPDATE | discovery-core, discovery-admin |
| discovery_run_sources | none | SELECT, INSERT | discovery-core |

Unnecessary, to be revoked:
- anon: all eight privileges on 13 tables; INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN on opportunities (keeps SELECT).
- authenticated, every table: TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
- authenticated, extra DML: DELETE on profiles; UPDATE and DELETE on skills; INSERT, UPDATE, DELETE on user_roles; UPDATE on saved_opportunities; UPDATE and DELETE on opportunity_audit_logs; table-level INSERT and DELETE on discovery_settings; DELETE on discovery_runs; UPDATE and DELETE on discovery_run_sources.
- Default privileges for role postgres in schema public: tables, sequences and functions for anon and authenticated.
- Untouched: service_role (the cron webhook), postgres, sandbox_exec, and every RLS policy.

## 4. Risk analysis

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Over-revoke breaks a feature | Low | High | targeted revokes only; REVOKE SELECT/UPDATE is never issued on discovery_settings (it would also wipe the column grants); grants re-asserted; assertion block aborts the migration if the end state is wrong; testing checklist; rollback |
| Future Lovable migrations rely on default grants and hit permission denied | Medium | Low-Medium (fails closed, visible) | existing migrations already add explicit GRANTs; follow-up AGENTS.md note; re-run the audit after each migration |
| Runner is not postgres or the platform re-applies defaults | Low (ASSUMPTION) | Medium | ALTER DEFAULT PRIVILEGES failure aborts the whole migration atomically; the audit catches re-applied defaults |
| supabase_admin default ACLs remain | Low | Low | postgres is not a member of supabase_admin (VERIFIED), so a migration cannot change them; objects created by supabase_admin in public are not expected |
| Rollback restores the exposure | Known | Medium | emergency use only; re-run the migration afterwards |

Risk of not doing it: the privilege layer stays fully open, so RLS is the only barrier; TRUNCATE is outside RLS; the cron_token column privilege stays reachable by anon the moment any policy for anon is added to discovery_settings; every future table is born wide open.

## 5. Remediation plan and rollback plan

1. rollback.sql and audit.sql are committed first, generated from the live snapshot before any revoke.
2. Save the 'before' output of audit.sql.
3. Apply the migration in a quiet window (9 profiles at the time of writing). It is one transaction; the final assertions abort it if anything is wrong.
4. Run audit.sql 'after' and the testing checklist.
5. If any check fails, run rollback.sql, re-run audit.sql, investigate. rollback.sql restores the exact pre-C5 state, including the exposure.
6. Follow-ups outside this PR: add an AGENTS.md rule that every new table needs explicit GRANTs and RLS; re-audit after each migration.

## 6. Testing checklist

Preparation: save the 'before' audit output; have three identities ready (logged-out browser, a brand-new user, the admin). Admin steps write data, so use a throwaway source and clean up afterwards. Keep scheduled discovery OFF.

- [ ] **Anonymous browsing:** home, /opportunities (about 113 rows on 8 Oct; it changes as deadlines pass), a detail page, /scholarships, /jobs. Same results as before.
- [ ] **Anonymous negative probes** (REST with the anon key): discovery_settings?select=cron_token, profiles, user_roles and saved_opportunities now fail with permission denied (before: 200 and an empty list); an anon POST to opportunities fails.
- [ ] **Sign up:** new email; confirm; the profile row is created by the trigger; /onboarding loads; completing all six steps (profile upsert, preferences, interests, skills) lands on /dashboard.
- [ ] **Sign in:** sign out and in; wrong password shows the error; /forgot-password and /reset-password load.
- [ ] **Save opportunity:** save from a detail page; it appears in /saved; unsave works.
- [ ] **Tracker:** track an opportunity (insert), change status (update), remove (delete); counts correct.
- [ ] **Recommendations:** /dashboard top three and /recommended load; edit the profile and save, including a brand-new skill (skills insert, delete-and-insert on preferences, interests and skills).
- [ ] **Admin review:** queue loads with source names; edit, approve, publish and reject one test draft; the audit table shows each action.
- [ ] **Admin sources:** list; add a throwaway source; edit it; toggle active; delete it.
- [ ] **Admin discovery:** page, run history and analytics load; toggle the schedule on and then back OFF (column update); run discovery manually against the single throwaway source (inserts runs, run sources, drafts and audit rows; updates source health); acknowledge runs; delete the test drafts afterwards.
- [ ] **Privilege negatives for a signed-in user:** cannot read cron_token; cannot write user_roles; cannot update or delete audit logs; the has_role RPC still works.
- [ ] **Post-change audit:** re-run audit.sql. Compare with sections 2 and 3; confirm service_role is unchanged and the RLS counts are 14 and 24.
- [ ] **Rollback drill:** read rollback.sql against the 'before' snapshot to confirm it restores each row; run it only if a check fails.

## 7. Out of scope (observed, not changed)

- sandbox_exec: a platform role with login, BYPASSRLS, and INSERT and SELECT on every public table (including cron_token). It is probably Lovable's own tooling (ASSUMPTION); revoking could break it.
- net schema: anon and authenticated have USAGE on net and SELECT on net.http_request_queue (platform default). Whether PostgREST exposes net is unverified (ASSUMPTION it does not). Investigate separately.
- cron schema: anon and authenticated have no USAGE (VERIFIED), so cron.job is unreachable; cron job commands embed the webhook token in plain text; cron_token is also stored in plain text.
- Wider items remain in their own roadmap entries (C6, C7, I15 and the rest).
