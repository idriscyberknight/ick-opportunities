-- ICK OPPORTUNITIES — A1.6.2 GUARDED PRODUCTION INSTALLATION PROPOSAL
-- Derived from reviewed isolated PostgreSQL prototype, CI-tested in PR #27.
-- IMPORTANT: DO NOT copy/paste into Production until exact transaction is
-- approved, the dedicated CI for THIS file passes, and a current private
-- recovery checkpoint has been independently verified restorable.
-- Not a Supabase migration ledger repair. Never replay C5/A1.4 historic DDL.
-- This file is executable only ONCE in the authoritative ICK Lovable Cloud DB.
-- Running via GitHub merge WILL NOT apply it to any database.
-- Owner/date/actor/runbook: docs/database/ICK_A16_2_CUTOVER_AND_INCIDENT_RESPONSE_PLAN.md

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';

-- These exact production fingerprints and counts were independently observed
-- on October 25, 2026; unknown drift MUST ABORT without a partial migration.
DO $preflight$
DECLARE
 v_colhash text;
 v_policyhash text;
 v_count integer;
BEGIN
 IF current_user <> 'postgres' THEN
  RAISE EXCEPTION 'STOP: unexpected migration database role %', current_user;
 END IF;
 SELECT md5(string_agg(format('%s:%s:%s:%s',table_name,column_name,udt_name,is_nullable),',' ORDER BY table_name,ordinal_position))
 INTO v_colhash FROM information_schema.columns
 WHERE table_schema='public' AND table_name IN
 ('universities','university_aliases','university_evidence','university_classifications');
 IF v_colhash IS DISTINCT FROM 'f28bdcbe5d4d796aea6a11b19dcb4964' THEN
  RAISE EXCEPTION 'STOP: registry column baseline mismatch';
 END IF;

 SELECT md5(string_agg(format('%s:%s:%s:%s',tablename,policyname,cmd,qual),',' ORDER BY tablename,policyname))
 INTO v_policyhash FROM pg_policies
 WHERE schemaname='public' AND tablename IN
 ('universities','university_aliases','university_evidence','university_classifications');
 IF v_policyhash IS DISTINCT FROM '4de4ac9298e5b4d5ad9f4a87253e33e6' THEN
  RAISE EXCEPTION 'STOP: existing registry RLS policy baseline mismatch';
 END IF;

 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('universities','university_aliases','university_evidence','university_classifications')) <> 12
 OR (SELECT count(*) FROM pg_class
     WHERE oid IN ('public.universities'::regclass,'public.university_aliases'::regclass,
                   'public.university_evidence'::regclass,'public.university_classifications'::regclass)
       AND relrowsecurity) <> 4
 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.universities'::regclass
 AND conname='universities_no_publishing_yet' AND convalidated) <> 1
 THEN
   RAISE EXCEPTION 'STOP: baseline policies/RLS/publishing guard not intact';
 END IF;

 -- Explicitly guard existing customer editorial work; never reset it.
 IF (SELECT count(*) FROM public.universities)<>1
 OR (SELECT count(*) FROM public.university_aliases)<>1
 OR (SELECT count(*) FROM public.university_evidence)<>1
 OR (SELECT count(*) FROM public.university_classifications)<>0
 OR (SELECT count(*) FROM public.universities WHERE
     publication_status='draft' AND verification_status='pending_review'
     AND reviewed_by IS NULL AND reviewed_at IS NULL AND published_at IS NULL)<>1
 OR (SELECT count(*) FROM public.university_evidence WHERE
     review_status='pending_review' AND checked_by IS NULL AND checked_at IS NULL
     AND visibility='internal')<>1
 THEN RAISE EXCEPTION 'STOP: registry rows or review states have changed'; END IF;

 IF to_regclass('public.university_review_events') IS NOT NULL OR
  to_regprocedure('public.ick_a16_review_evidence(uuid,text,text,text)') IS NOT NULL OR
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname LIKE 'a16_%' AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'STOP: review engine is already partly installed'; END IF;

 IF (SELECT count(*) FROM supabase_migrations.schema_migrations)<>13
 THEN RAISE EXCEPTION 'STOP: existing legacy migration history changed'; END IF;
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE
  version='20261008100000')<>0
 THEN RAISE EXCEPTION 'STOP: C5 adoption happened separately; replan'; END IF;
 IF NOT has_table_privilege('authenticated','public.universities','UPDATE')
 OR has_table_privilege('anon','public.universities','UPDATE')
 OR NOT has_function_privilege('authenticated',
   'public.has_role(uuid,public.app_role)','EXECUTE')
 THEN RAISE EXCEPTION 'STOP: client grant posture differs from reviewed baseline'; END IF;
END $preflight$;

-- Installation body starts. Status must remain draft/locked; only evidence may
-- be editorially reviewed by an authorized Admin via the atomic audited RPC.

-- This is intentionally a client-append-only EVENT table. Its owner is still
-- privileged; no blockchain/immutable-storage claims are made.
CREATE TABLE public.university_review_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 evidence_id uuid NOT NULL REFERENCES public.university_evidence(id) ON DELETE RESTRICT,
 university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
 decision text NOT NULL CHECK (decision IN ('reviewed','rejected')),
 previous_state text NOT NULL CHECK (previous_state = 'pending_review'),
 new_state text NOT NULL CHECK (new_state IN ('reviewed','rejected')),
 review_reason text NOT NULL CHECK (length(btrim(review_reason)) BETWEEN 20 AND 2000),
 source_url_at_review text NOT NULL,
 claim_type_at_review text NOT NULL,
 reviewed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT university_review_event_decision_matches CHECK (decision = new_state)
);
CREATE INDEX university_review_events_evidence_time
  ON public.university_review_events(evidence_id,reviewed_at DESC);
REVOKE ALL ON public.university_review_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.university_review_events TO authenticated;
GRANT ALL ON public.university_review_events TO service_role;
ALTER TABLE public.university_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY university_review_event_admin_read
 ON public.university_review_events FOR SELECT TO authenticated
 USING (public.has_role((SELECT auth.uid()),'admin'::public.app_role));
-- No policies permitting client INSERT, UPDATE, or DELETE on review events.

-- Insertion checks prevent an Admin directly inserting a preapproved row
-- while keeping existing A1.5 explicit draft-status INSERT payloads working.
CREATE FUNCTION public.ick_a16_enforce_unreviewed_registry_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
 IF TG_TABLE_NAME = 'universities' THEN
  IF NEW.verification_status IS DISTINCT FROM 'pending_review'
    OR NEW.publication_status IS DISTINCT FROM 'draft'
    OR NEW.reviewed_by IS NOT NULL
    OR NEW.reviewed_at IS NOT NULL
    OR NEW.published_at IS NOT NULL
  THEN RAISE EXCEPTION 'university insertion must be private, unreviewed draft'
    USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'university_evidence' THEN
  IF NEW.review_status IS DISTINCT FROM 'pending_review'
    OR NEW.visibility IS DISTINCT FROM 'internal'
    OR NEW.checked_by IS NOT NULL
    OR NEW.checked_at IS NOT NULL
  THEN RAISE EXCEPTION 'evidence insertion must be unreviewed and internal'
    USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME = 'university_classifications' THEN
  IF NEW.review_status IS DISTINCT FROM 'pending_review'
  THEN RAISE EXCEPTION 'classification insertion must be unreviewed'
    USING ERRCODE='23514'; END IF;
 ELSE
  RAISE EXCEPTION 'unexpected registry trigger table' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ick_a16_enforce_unreviewed_registry_insert()
 FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a16_university_insert_check
 BEFORE INSERT ON public.universities FOR EACH ROW
 EXECUTE FUNCTION public.ick_a16_enforce_unreviewed_registry_insert();
CREATE TRIGGER a16_evidence_insert_check
 BEFORE INSERT ON public.university_evidence FOR EACH ROW
 EXECUTE FUNCTION public.ick_a16_enforce_unreviewed_registry_insert();
CREATE TRIGGER a16_classification_insert_check
 BEFORE INSERT ON public.university_classifications FOR EACH ROW
 EXECUTE FUNCTION public.ick_a16_enforce_unreviewed_registry_insert();

-- Harden sensitive UPDATE rights. Crucially revoke the *table-level* UPDATE
-- grant first; otherwise column-level REVOKE alone is not sufficient.
REVOKE UPDATE ON
 public.universities,
 public.university_aliases,
 public.university_evidence,
 public.university_classifications
FROM authenticated;
GRANT UPDATE (official_name,country_code,city,official_website,summary)
 ON public.universities TO authenticated;
-- No direct authenticated UPDATE on evidence, classification, or alias state.
-- A1.5 draft editor uses exactly the five allowlisted columns PLUS resetting
-- reviewed metadata. This prototype requires a corresponding frontend change
-- before production rollout (safe API patch must omit reviewed_*). Not shipped.

-- Prevent previously reviewed evidence from silently remaining authoritative
-- after Admin changes the underlying institution identity fields. A subsequent
-- controlled evidence-retraction/review workflow is required to unlock changes.
-- A1.5 pending-only drafts still permit normal edits.
CREATE FUNCTION public.ick_a16_block_edits_after_source_review()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
 IF (NEW.official_name,NEW.country_code,NEW.city,
     NEW.official_website,NEW.summary)
   IS DISTINCT FROM
    (OLD.official_name,OLD.country_code,OLD.city,
     OLD.official_website,OLD.summary)
   AND EXISTS (
     SELECT 1 FROM public.university_evidence e
     WHERE e.university_id=OLD.id AND e.review_status='reviewed'
   )
 THEN
   RAISE EXCEPTION
     'edited institutional identity requires a new review/retraction decision'
     USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ick_a16_block_edits_after_source_review()
 FROM PUBLIC, anon, authenticated;
CREATE TRIGGER a16_institution_no_edit_after_review
 BEFORE UPDATE OF official_name,country_code,city,official_website,summary
 ON public.universities
 FOR EACH ROW EXECUTE FUNCTION public.ick_a16_block_edits_after_source_review();

-- One trusted, atomic source-specific editorial decision entrypoint.
-- The current Admin role is the only implemented role; no invented reviewer role.
-- A 'reviewed' event denotes a HUMAN editorial attestation, NOT accreditation
-- or automatic institutional verification, and does not publish any university.
CREATE FUNCTION public.ick_a16_review_evidence(
 p_evidence_id uuid,
 p_decision text,
 p_reason text,
 p_expected_state text DEFAULT 'pending_review'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
 v_actor uuid;
 v_evidence public.university_evidence%ROWTYPE;
 v_event uuid;
 v_checked_at timestamptz;
BEGIN
 v_actor := auth.uid();
 IF v_actor IS NULL OR
    NOT public.has_role(v_actor,'admin'::public.app_role)
 THEN
   RAISE EXCEPTION 'editorial review is restricted to Admin'
      USING ERRCODE='42501';
 END IF;
 IF p_evidence_id IS NULL OR p_decision NOT IN ('reviewed','rejected') OR
    p_decision IS NULL OR
    p_expected_state IS DISTINCT FROM 'pending_review' OR
    length(btrim(coalesce(p_reason,''))) NOT BETWEEN 20 AND 2000
 THEN
   RAISE EXCEPTION 'invalid evidence decision or review rationale'
      USING ERRCODE='22023';
 END IF;

 SELECT * INTO v_evidence FROM public.university_evidence
 WHERE id=p_evidence_id FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'evidence not found' USING ERRCODE='P0002';
 END IF;
 IF v_evidence.review_status IS DISTINCT FROM p_expected_state OR
    v_evidence.checked_by IS NOT NULL OR v_evidence.checked_at IS NOT NULL OR
    v_evidence.visibility IS DISTINCT FROM 'internal'
 THEN
   RAISE EXCEPTION 'stale or already-reviewed evidence; refresh first'
      USING ERRCODE='40001';
 END IF;
 IF v_evidence.source_url !~ '^https://[^[:space:]]+$' THEN
   RAISE EXCEPTION 'invalid source URL' USING ERRCODE='22023';
 END IF;

 v_checked_at := clock_timestamp();
 UPDATE public.university_evidence SET
   review_status=p_decision,
   checked_by=v_actor,
   checked_at=v_checked_at
 WHERE id=v_evidence.id AND review_status='pending_review';
 IF NOT FOUND THEN
   RAISE EXCEPTION 'review race; status not updated' USING ERRCODE='40001';
 END IF;

 INSERT INTO public.university_review_events
 (evidence_id,university_id,decision,previous_state,new_state,review_reason,
  source_url_at_review,claim_type_at_review,reviewed_by,reviewed_at)
 VALUES (v_evidence.id,v_evidence.university_id,p_decision,
   'pending_review',p_decision,btrim(p_reason),v_evidence.source_url,
   v_evidence.claim_type,v_actor,v_checked_at)
 RETURNING id INTO v_event;

 RETURN v_event;
END;
$$;
REVOKE ALL ON FUNCTION public.ick_a16_review_evidence(uuid,text,text,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ick_a16_review_evidence(uuid,text,text,text)
 TO authenticated;

-- A1.6.2 postconditions: a failure here ABORTS ALL DDL and REVOKE/GRANT changes.
DO $postflight$
DECLARE v_function oid := to_regprocedure('public.ick_a16_review_evidence(uuid,text,text,text)');
BEGIN
 IF v_function IS NULL OR to_regclass('public.university_review_events') IS NULL
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.university_review_events'::regclass)
 OR NOT (SELECT prosecdef FROM pg_proc WHERE oid=v_function)
 OR has_function_privilege('anon',v_function,'EXECUTE')
 OR NOT has_function_privilege('authenticated',v_function,'EXECUTE')
 OR has_table_privilege('authenticated','public.university_review_events','INSERT')
 OR has_table_privilege('authenticated','public.university_review_events','UPDATE')
 OR has_table_privilege('authenticated','public.university_review_events','DELETE')
 THEN RAISE EXCEPTION 'FAIL: A1.6 review function or audit ACLs unsafe'; END IF;

 IF EXISTS (
 SELECT 1 FROM (VALUES
 ('universities','verification_status'),('universities','reviewed_by'),
 ('universities','reviewed_at'),('universities','publication_status'),
 ('universities','published_at'),('university_evidence','review_status'),
 ('university_evidence','checked_by'),('university_evidence','checked_at'),
 ('university_evidence','visibility'),
 ('university_classifications','review_status')
 ) AS s(t,c) WHERE has_column_privilege('authenticated',
 ('public.'||s.t)::regclass,s.c,'UPDATE')
 ) THEN RAISE EXCEPTION 'FAIL: one or more direct approval metadata UPDATE privileges remain'; END IF;

 IF NOT (SELECT bool_and(has_column_privilege('authenticated','public.universities',c,'UPDATE'))
 FROM unnest(ARRAY['official_name','country_code','city','official_website','summary']) AS c)
 THEN RAISE EXCEPTION 'FAIL: safe five-field draft UPDATE was lost'; END IF;

 IF (SELECT count(*) FROM public.universities)<>1 OR
 (SELECT count(*) FROM public.university_aliases)<>1 OR
 (SELECT count(*) FROM public.university_evidence)<>1 OR
 (SELECT count(*) FROM public.university_classifications)<>0 OR
 (SELECT count(*) FROM public.university_review_events)<>0 OR
 (SELECT count(*) FROM public.university_evidence WHERE review_status='pending_review')<>1 OR
 (SELECT count(*) FROM pg_constraint WHERE conrelid='public.universities'::regclass
   AND conname='universities_no_publishing_yet' AND convalidated)<>1
 THEN RAISE EXCEPTION 'FAIL: existing records changed or publishing guard removed'; END IF;
END $postflight$;
COMMIT;
-- No evidence has been reviewed and no university has been published by this migration.
