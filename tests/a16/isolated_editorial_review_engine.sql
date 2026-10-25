-- A1.6.2 PROTOTYPE — DISPOSABLE GITHUB ACTIONS POSTGRES 17 ONLY.
-- NEVER EXECUTE ON LOVABLE CLOUD PRODUCTION OR SECURITY STAGING.
-- Not an approved migration; cannot be merged or applied as deployment SQL.
-- Requires tests/a15/isolated_bootstrap.sql AND the historical A1.4 schema
-- created in a fresh isolated CI container.
\set ON_ERROR_STOP on
BEGIN;

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
COMMIT;
-- END ISOLATED REFERENCE ONLY.
