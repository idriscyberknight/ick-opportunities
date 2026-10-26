# ICK Opportunities — A1.8 Phase 1: Opt-in In-App Alerts Architecture & Security Gates

**Date:** 2026-10-26  
**Status:** Architecture proposal plus passive code-only candidate engine. **NO live alerts, DB tables, cron, push, email, notification center, or opt-in UI implemented by this phase.**  
**Parent:** ICK Technologies; tracked in GitHub issue #35.

## 1. Verified baseline — what already exists

- Current `src/lib/matching.ts` is the user's established **heuristic** opportunity matching algorithm (category, skills, interests, education, country); match percentage **is NOT an eligibility or scholarship-success probability**.
- `src/components/RecommendedOpportunities.tsx` and `/recommended` already render recommendations. **Do not duplicate the model.**
- `src/components/DiscoveryNotice.tsx` is **Admin-only discovery-run feedback**; it is not a persisted customer notification system.
- `profiles`, `user_opportunity_preferences`, `saved_opportunities` and `opportunities` are existing records used by recommendations. Live public schema inspection found **no** `alert`/`notification`/`subscription` tables. This does not prove absence of external systems.
- Production `opportunities` RLS public SELECT policy requires ALL of: `status = active`, `verified_status = verified`, `published_at <= now()` and non-null, `reviewed_by` and `reviewed_at` present, and `deadline` not expired.
- Existing university source reviews: **7 canonical private drafts, 15 reviewed sources and 15 audit events**. `islamic-university-in-niger` deferred by Founder. **Do not source user alerts from university private drafts.**

## 2. Minimal privacy-first MVP

**Channel: in-app ONLY** at first. Users explicitly toggle **Enable in-app opportunity alerts**, default OFF. No auto-opt-in from signup or profile completion. A disabled user gets **zero** generated alert candidates and no alert writes.

Preferences: types (scholarship, job, internship, grant), enable new personalized matches, enable **saved-opportunity** deadline reminders, minimum match score (relevance only), day thresholds (suggested 7, 3, 1), validated IANA timezone, and optional future quiet hours for external delivery. Selecting nothing yields no new-match alerts; saved deadlines use explicit saved records and their separate toggle. If a profile is incomplete, new-match alerts are disabled without disabling saved deadline reminders.

In-App Notification Center: authenticated-only `/notifications` page in a **future phase**, with accessible unread count, `All/Unread` view, link to its still-visible published opportunity, mark read, dismiss, concise reason ("matches your saved interests" or "deadline in 3 days"), and unambiguous no alerts yet / alerts disabled / loading / error states. Never display draft or unpublished opportunity details via notification payloads. A university directory's static "under review" records are NEVER a funding alert source.

**New match eligibility:** already published AND verified AND editorially reviewed AND active AND deadline not passed; within initial 14-day publication window; explicitly matching user-selected category and existing profile ranking `score >= threshold`. Relevance is not applicant eligibility.

**Saved deadline reminder eligibility:** separately opted-in; a user **saved** the opportunity; still published, reviewed, active and unexpired; reminder windows `7/3/1` days (configurable). No reminder if deadline missing or invalid. Milestone keys are stable across multiple processing days; dedupe in DB is mandatory. A deadline-date change gives a new milestone and must be handled as an explicit reviewed source update, not guessed.

**Material changes:** deferred until server-recorded, vetted change event with before/after values and permitted public-read proof; **do not** infer from `updated_at` or `discovered_at` alone. No PDF/email/WhatsApp provider or paid services in initial MVP.

## 3. PROPOSED schema — NOT APPLIED

Proposed versioned migration on a **separate reviewed release**; inspect current database schema first, then implement/test in an isolated environment.

### `public.alert_preferences` (1 per user)
| Column | Type | Rule |
|---|---|---|
| `user_id` | uuid PK FK `auth.users(id)` ON DELETE CASCADE | current authenticated owner only |
| `enabled` | boolean NOT NULL DEFAULT false | explicit opt-in |
| `new_matches_enabled` | boolean NOT NULL DEFAULT true | subordinate to enabled |
| `saved_deadlines_enabled` | boolean NOT NULL DEFAULT true | subordinate to enabled |
| `categories` | opportunity_category[] NOT NULL DEFAULT '{}' | validated fixed set |
| `minimum_match_score` | smallint NOT NULL DEFAULT 40 | CHECK 0–100 |
| `deadline_lead_days` | smallint[] NOT NULL DEFAULT '{1,3,7}' | reject 0, >30 and duplicates |
| `timezone` | text NOT NULL DEFAULT 'Africa/Lagos' | validated IANA by server |
| `updated_at` | timestamptz NOT NULL | audited write time |

### `public.user_notifications` (generated ONLY by trusted backend)
| Column | Type | Rule |
|---|---|---|
| `id` | uuid PK | random |
| `user_id` | uuid NOT NULL FK `auth.users(id)` CASCADE | RLS owner |
| `opportunity_id` | uuid NOT NULL FK `opportunities(id)` | published-view revalidation on SELECT/display |
| `kind` | constrained text | `new_match`, `saved_deadline`; add material update later |
| `event_key` | text NOT NULL | **UNIQUE(user_id, event_key)** atomic idempotency |
| `created_at` | timestamptz NOT NULL | server timestamp |
| `read_at` | timestamptz NULL | ONLY user-editable notification column |
| `dismissed_at` | timestamptz NULL | ONLY user-editable notification column |

Avoid storing unreviewed opportunity titles/descriptions or personal attributes in notification payloads. Use an RLS-protected join to the existing public-visible opportunity row, with a generic revoked/unavailable message if publication is withdrawn. Index `(user_id, created_at DESC)` and `(user_id, read_at)`. Retention proposal: auto-delete old dismissed notifications after 90 days once tested; do not silently claim this cleanup exists.

### Dedicated internal delivery/audit module (future)
A trusted server worker / outbox should:
1. Re-validate user consent and profile input **at delivery time** (users may opt out after candidate generation).
2. Fetch only vetted public `opportunities` data; a revoked listing must not send.
3. Require candidate event keys unique per user and opportunity milestone; perform `INSERT ... ON CONFLICT (user_id,event_key) DO NOTHING` inside a transaction.
4. Log batch counts, failures, retry cursor and dropped candidates **without exposing user PII in plaintext logs**.
5. Apply rate limits, max alerts/user/day and catch-up windows. Quiet hours only affect external delivery if enabled later.
6. Never hold service-role keys in the client, do not create publicly callable `SECURITY DEFINER` functions, and do not reuse production Admin discovery cron for personalized delivery without risk review.

## 4. PROPOSED RLS + grants — illustrative only, DO NOT RUN on Production

The specific authorized migration will use explicit `GRANT` plus RLS, with **real signed JWT user A, user B and anon tests** before any merge or DB release. These fragments are not a deployable migration and intentionally omit `CREATE TABLE`.

```sql
-- Apply only after tables and default privileges have been safely reviewed.
alter table public.alert_preferences enable row level security;
revoke all on table public.alert_preferences from anon, authenticated;
grant select, insert, update, delete on table public.alert_preferences to authenticated;

create policy "alert_preferences_owner_select" on public.alert_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "alert_preferences_owner_insert" on public.alert_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "alert_preferences_owner_update" on public.alert_preferences
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "alert_preferences_owner_delete" on public.alert_preferences
  for delete to authenticated using (user_id = (select auth.uid()));

alter table public.user_notifications enable row level security;
revoke all on table public.user_notifications from anon, authenticated;
grant select, update(read_at, dismissed_at) on public.user_notifications to authenticated;

create policy "user_notification_owner_select" on public.user_notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_notification_owner_update" on public.user_notifications
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- NO authenticated or anon INSERT/DELETE on user_notifications.
-- Trusted backend writes must revalidate consent and published status first.
-- Add UNIQUE(user_id, event_key) and owner-leading indexes in the actual migration.
```

**Adversarial tests:** anon cannot view/write; A cannot see/mutate B's preferences or notifications; A cannot change `user_id` or notification payload; client cannot insert notifications; a normal user cannot query drafts; a revoked opportunity becomes non-displayable; deny/allow must be verified under genuine JWTs with exact rows affected, not hypothetical SQL-only role checks.

Reference: [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security). If a server scheduler becomes necessary, [Supabase Cron](https://supabase.com/docs/guides/cron) describes Postgres jobs; it is **NOT enabled or scheduled by this design**. Check Lovable Cloud availability and Free tier constraints independently; do not assume a second connected Supabase project is the authoritative database.

## 5. Phase 1 executable candidate model — passive and testable

`src/lib/opportunity-alerts.ts`:
- no database requests, timer, network, localStorage, push subscription, email, personal data persist, or UI integration.
- explicit opt-in OFF by default, published/reviewed/active/verified gate, fresh new-match window, saved deadline milestones, input calendar date in **user timezone**, deterministic ordering and defensive dedupe.
- reuses the existing recommendation engine; a new optional injected `today` parameter to `rankOpportunities` preserves old callers' default.
- **Caution**: local in-memory dedupe does not cover concurrent workers; DB unique index and outbox worker are required in Phase 2. Candidate generation does not confirm user eligibility or actual notifications.

## 6. Founder-controlled phase gates

- **A1.8.1 (THIS PR)**: candidate calculation, UX & data/RLS blueprint, tests, no real alert feature.
- **A1.8.2**: approve a reviewed schema + privileges migration and test on isolated backend with signed JWT adversarial tests; never Production SQL without separate Founder sign-off.
- **A1.8.3**: build explicit opt-in UI and authenticated in-app notification center with real persistence; test empty/loading/error/account switching and accessibility.
- **A1.8.4**: guarded scheduled delivery with proof against duplicate notifications, spam, cross-user data exposure and revoked listings, plus rollback metrics. Separate approval for any email/push or fee-bearing provider.
- **A1.9**: revisit recommendation scoring semantics only after alert correctness and reliability gates are met.

**Rollout rule:** A1.8.1 safe code-only merge != feature launch; no notification promises or automatic triggering until all later gates pass.  
**Rollback:** revert passive PR if CI fails; future notification job must have an explicit disable switch with notifications preserved as historical records.

**Excluded from this phase:** Niger university data, public university publishing, customer analytics tracking, app notifications, credential handling, and any external provider charges.
