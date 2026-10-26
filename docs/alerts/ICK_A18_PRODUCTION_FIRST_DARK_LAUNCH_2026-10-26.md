# ICK Opportunities — A1.8 Production-First Opt-In Pilot (dark launch)
**Status:** CODE PROPOSAL ONLY. Not a live launch. Founder requested a Production-first path following the Security Staging preview 404.  
**Target:** Official Production GitHub repo `idriscyberknight/ick-opportunities`; separate Production Lovable project `433a53c8-8872-49f2-b7b8-3e8dc7e96e35`.  
**Principle:** Do not conflate GitHub merge with approval to migrate the Production database or turn on delivery.

## Verified baseline on 2026-10-26
- Production Lovable Cloud Supabase reports **19 public tables**.
- Production has `public.opportunities`, `public.saved_opportunities`, `public.university_review_events`, and `supabase_migrations.schema_migrations`.
- Production does **NOT** have `public.alert_preferences` or `public.user_notifications`.
- Earlier separate Security Staging had those two tables, RLS and anonymous-deny checks; this does **not** prove Production readiness.
- Staging backend's reviewed DDL has a **Staging-only preflight** that explicitly detects the Production-only events/ledger and RAISES; **DO NOT execute or transplant** `design/a18/alert_staging_schema_REVIEW_ONLY.sql` to Production.

## Proposed code-only release (this PR)
- Add `/alerts` under existing signed-in/onboarded parent route, **unlinked from navigation**.
- Reuse existing opt-in preferences and inbox components, with no fabricated notifications.
- Build-time gate `VITE_A18_PRODUCTION_ALERTS_ENABLED === "true"` PLUS **exact Production backend hostname** `c--433a53c8-8872-49f2-b7b8-3e8dc7e96e35-prod.lovable.cloud`. When OFF/missing, the page explains limited availability and makes **zero alert DB requests**.
- Adapter uses the existing user session (Supabase `auth.getUser()`), never a browser service-role secret; preserves `src/integrations/supabase/client.ts`.
- Preferences are OFF by default. No implicit opt-in, no cron, no email/SMS/push/WhatsApp, no event insertion from browser.
- Generate the TanStack route tree through its actual build tool, commit the resulting tree, assert route registration and no drift in CI. This specifically addresses the earlier 404 risk.

## Release gates — separate explicit Founder approval for EACH affected environment/action
1. **Code gate:** GitHub opt-in tests, SSR/build, generated route tree consistency, TypeScript and lint pass. Human review of changed files. No merges without Founder authorization.
2. **Production schema design:** Prepare a **new Production-specific** migration with transaction, target-identity preflight that validates the real Production ledger/events/tables, reviewed enum/type/constraint drift, hardened owner-only RLS and least-privilege column grants, indexes, trigger behavior, duplicate prevention, and tested rollback. DO NOT reapply Staging DDL. Preserve existing production data.
3. **Backup/recovery:** Review actual restore evidence and Production migration ledger integration before any schema write.
4. **Production DDL gate:** Obtain specific approval for the exact new SQL, database target, timing and recovery plan. Nothing executes as part of this code-only PR.
5. **Authenticated security:** Test at least two **genuine existing/consented** signed-user sessions on the authorized target: A owner insert/read/update/opt-out; B cannot read/update A; anonymous/no-key denied; restricted notification columns denied. Avoid unapproved account creation and do not expose JWTs in CI logs.
6. **Flag gate:** Only after security checks and explicit Founder approval, set the Production pilot build flag on the exact deploy target. Initial audience limited; default OFF per account. Test route on the official Production deployment, not Lovable preview, before linking in navigation.
7. **Delivery gate:** Trusted server-side worker/scheduler, stable unique `(user_id,event_key)`, verified active/published opportunities, timezone correctness, rate limits, retention, opt-out, observability, retries, audit and dedupe **still unimplemented**. No notification delivery claims until separately developed and tested.

## Monitoring and stop conditions
Stop on wrong backend hostname, missing table/grants, any cross-user access, unexpected stored opt-in, notification leakage, failed backup, schema drift, or runtime error. Keep the feature flag OFF while investigating. The existing recommendation and search experiences should remain unchanged.

## Outcomes for users
Before flags+schema: existing /recommended and /saved continue; `/alerts` is unavailable and unlinked.  
After authorized schema+flag+tests: user may explicitly Save personal in-app preferences; notifications may remain empty because trusted generation/delivery does **not** exist yet.
