# ICK Opportunities — A1.8 Final Production Acceptance Gate
**Date:** 2026-11-09  
**Change:** Draft PR #45 (review branch only)  
**Policy:** No Production SQL/DDL, data writes, feature activation, user communications, merge or release without a separate explicit Founder authorization.

## Evidence inventory (read-only)

| Check | Status | Evidence and limits |
|---|---|---|
| PR #45 | DRAFT / UNMERGED | Github `fix/a18-fail-closed-digest-safety-20261109`; excludes direct notification table-upsert fallback; email digest consent/relevance corrections. |
| PR head CI | PASS | GitHub Actions run #42598083198: A1.8 tests, email tests, build, TypeScript, route registry, lint. These are not genuine signed-user Production tests. |
| Public Production deployment | READY | Vercel deployment `dpl_CPXpW8KG5VoBbg9eTAurSeV8cqUU` aliases `ick-opportunities.vercel.app` and runs `main` commit `e18d8cf`, **not PR #45**. |
| Cloud database | Present, not release-accepted | Previous read-only Lovable database inspection confirmed `alert_preferences` and `user_notifications`, RLS enabled, four + two relevant policies, and `a18_insert_notifications_guarded(jsonb)` installed. |
| RPC privileges | PASS for catalog permissions only | Previous read-only query: `anon` and `authenticated` cannot execute guarded RPC; `service_role` can; `authenticated` cannot INSERT notifications. This does not replace real signed-JWT tests. |
| Actual data | NOT PILOTED | Previous read-only query returned 0 preferences, 0 opted-in preferences, 0 notifications. |
| Migration history | UNRESOLVED | Cloud ledger previously showed 13 entries, latest `20261005021810`; do not forge records or replay SQL to reconcile. |
| Scheduler registration (Lovable Cloud) | **CONFIRMED ACTIVE** | Read-only Cloud database catalog confirms `pg_cron` installed and job `a18-in-app-alerts-daily` marked active, schedule `0 6 * * *` (06:00 UTC / 07:00 Nigeria time). The job's SQL completed with `succeeded` status on Nov 8 and Nov 9, 2026. This confirms the scheduled DB job ran, **NOT that HTTP delivery succeeded or a notification was inserted**. No cron definition, credentials or settings were modified. |
| Downstream worker delivery credentials | NOT YET VERIFIED | Vercel project variable **names** were read without decrypting values. That inventory does **not** establish whether configuration is held by Lovable Cloud/Vault or another runtime. Do not ask the Founder to recreate previously configured secrets without specific evidence of a fault. |
| Production alert flag | OFF / NOT VERIFIED ENABLED | `VITE_A18_PRODUCTION_ALERTS_ENABLED` absent from the Vercel variable-name inventory. |
| Email delivery | NOT IMPLEMENTATION-VERIFIED | Digest rendering and offline mock transport tests exist; no confirmed production provider, delivery route/schedule, consent workflow, unsubscribe, retry/claim/outbox or real send. Do not send email. |

## Mandatory acceptance cases — run only in an authorized isolated test environment

Each test must retain redacted evidence with target ID, commit, role, time, expected/actual outcome, and whether any state changed. **Do not upload credentials or identifiable records.**

1. **Identity and target preflight (read-only):** confirm precise deployment branch/SHA, backend project and database identity, RLS policies, RPC code hash and grants, migration ledger, backups and non-destructive rollback plan.
2. **Anonymous access (read-only):** anonymous request cannot SELECT/INSERT/UPDATE preferences or notifications; cannot invoke guarded RPC; unauthenticated cron POST returns 401 when auth secret is configured. A 500 (server misconfiguration) is a FAIL, not passing authorization.
3. **Signed User A/User B isolation (controlled test accounts):** A can access only A preferences/notifications; B can access only B; A/B cannot mutate each other's rows or forge internal event keys; no leakage from rejected, expired or unpublished opportunities. Must use *real signed sessions*, not mock `auth.uid()`.
4. **Opt-in/opt-out (requires separate test-write approval):** default OFF; explicit consent persisted and read back; no inserts after opt-out or category/threshold change; direct browser INSERT denied. Confirm changes through signed clients and rollback test data in isolated environment.
5. **Atomic insertion (requires separate test-write approval):** as controlled races, withdraw consent or publication while the worker runs; prove guarded RPC prevents new event writes on committed withdrawal. Confirm dedupe, retries and concurrent job runs; no direct-upsert fallback.
6. **Deadline and pagination (isolated test data):** timezone near-midnight, DST where supported, deadline change, reminder intervals 7/3/1, >50 events, >one user page, cap/truncation and restart progression. Review fairness when `maxUsersPerRun` is reached.
7. **Delivery runtime (separate deployment and scheduler approval):** securely provision server-only credentials, verify endpoint is reachable only by authorized scheduler, observe nonzero opted-in account controlled run and recorded event, test failures/retry/rate limits, report errors without PII. Never expose secrets in browser bundles or logs.
8. **UI (controlled test accounts):** confirm bell route and inaccessible OFF state, loading/error/empty states, read/dismiss, owner isolation, accessibility, mobile and multilingual display as supported. Do not falsely claim a saved preference if backend write failed.
9. **Email separate gate:** do not activate digest until sender authentication, explicit *email-specific* consent, category and score enforcement, working unsubscribe link, safe recheck immediately before send, idempotency/claim, provider-level rate limits and delivery telemetry are verified. Mock transport success does not count.
10. **Controlled release:** only after above evidence and explicit Founder signoff, approve narrow pilot/release flag separately from any merge. Monitor complaints/errors; retain immediate disable and rollback.

## Decision and stop conditions

**Status: BLOCKED FOR PRODUCTION ACTIVATION.** Passing CI means reviewable code, not live-system completion. Do not merge PR #45 or turn alerts/email ON solely because build, TypeScript and offline tests passed.

**Next safe action:** review the current draft PR and the Production deployment's server-side secret/scheduler availability in read-only mode, then perform authorized real signed-session tests on a separate controlled test target. Production user writes, SQL changes, release and email sending each require specific approval.

## 2026-11-09 read-only/code regression follow-up — PR #45

- **Cursor coverage:** The server-only route `POST /api/public/jobs/alerts` accepts an *authenticated* `?afterUserId=<UUID>` cursor. Each bounded batch returns `nextUserCursor` when additional opted-in users exist. The trusted scheduler must call again with this value until it is null. This is **not evidence the existing scheduler already does so**; absent an orchestrator that follows cursors, users after the first 2,000 remain at risk of starvation.
- **Saved opportunities:** The service-role adapter uses `opportunity_id` keyset pagination instead of relying on PostgREST's possible 1,000-row default limit; a mock coverage test checks 2,003 saved IDs.
- **Timezone eligibility:** The candidate query accepts a conservative one-day-earlier UTC deadline cutoff so users west of UTC are not lost at midnight. The planner subsequently applies per-user local date and the installed guarded RPC has a per-user timezone deadline condition.
- **Backend matching inputs:** Errors in skills/interests/preferences queries now fail the affected account instead of silently generating an incomplete match.
- **New CI evidence:** GitHub Actions run #42604273323 passed 59 A1.8 tests and 18 email tests, build, TypeScript and the scoped linter, all on a proposal branch. No real user messages or Production writes were performed.
- **Observed deployment discrepancy:** Read-only Vercel domain resolution at this review returned Production deployment `dpl_BUCyXRtVqKsEdvHNefM8Lz2H19aH`, commit `67b60f3780d23708e7fda5297dfad13ba07b3fac`. GitHub main head remained `e18d8cf39380efbf7d60c290ed99eda024d75876`. Both are distinct from draft PR #45; verify deployment provenance before any release and do not assume how the discrepancy arose.
- **Unresolved at scale:** Opportunities are capped at 5,000 per worker run; `truncatedOpportunities: true` signals incomplete coverage. The scheduler continuation mechanism is newly introduced and is not proven in any actual runtime. Neither deficiency should be represented as production-ready.
- **STOP:** No automatic Production merge, SQL, credential modification, user email, in-app notification dispatch, or release flag changes are authorized by this document.

## 2026-11-09 actual scheduled-job evidence (read-only)

- **Positive discovery, correcting earlier uncertainty:** Lovable Cloud PostgreSQL has `pg_cron` installed, with an **active** existing job named `a18-in-app-alerts-daily`, scheduled `0 6 * * *`. The job's run history contains two `succeeded` runs: **2026-11-08 06:00 UTC** and **2026-11-09 06:00 UTC**, each finishing roughly 15 seconds after starting.
- **Important scope limitation:** a successful `cron.job_run_details` entry reports the database cron command's completion only. It does **not** prove that an outbound HTTP request reached Vercel, that the request's response was successful, that an alert worker processed users, or that a notification was delivered.
- **Production consent reality:** the same read-only audit showed **zero** `alert_preferences` rows, zero enabled preferences and zero `user_notifications` rows. Absence of delivered notifications can be the expected privacy-preserving result with no opted-in users and is not, by itself, a broken scheduler.
- **Observability limits:** Vercel runtime logs for the last 30 minutes returned no matching `/api/public/jobs/alerts` entries; these logs do not cover the **06:00 UTC** cron runs. A 24-hour Vercel log query was rejected due to the plan's short retention window. Therefore no claim can be made about the cron runs' downstream HTTP responses using those Vercel logs.
- **Read-only evidence gap:** the Lovable Cloud MCP query limit was reached before verifying the cron command type, pg_net HTTP response ledger or the endpoint's actual worker result. We did not query or expose any secret-bearing cron command text. No change was made to existing schedules or settings.
- **Conclusion:** mark **scheduled job installed and firing** as verified, and **downstream notification delivery** as unverified. Do not recommend re-creating the existing cron as a blanket fix.

