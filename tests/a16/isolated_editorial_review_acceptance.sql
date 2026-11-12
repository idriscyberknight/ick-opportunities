-- A1.6.2 ISOLATED DISPOSABLE POSTGRES TESTS; NOT real HTTP/JWT.
-- Requires isolated_bootstrap.sql + historical A1.4 schema + isolated prototype.
-- Everything inserted for this test is discarded by ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.user_roles (user_id,role) VALUES
 ('11111111-1111-4111-8111-111111111111','admin');

DO $preconditions$
DECLARE n integer;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_proc
  WHERE oid='public.ick_a16_review_evidence(uuid,text,text,text)'::regprocedure
    AND prosecdef
 ) THEN RAISE EXCEPTION 'FAIL: review function not security definer'; END IF;
 IF has_function_privilege('anon',
 'public.ick_a16_review_evidence(uuid,text,text,text)', 'EXECUTE') THEN
  RAISE EXCEPTION 'FAIL: anon can execute review function'; END IF;
 IF NOT has_function_privilege('authenticated',
 'public.ick_a16_review_evidence(uuid,text,text,text)', 'EXECUTE') THEN
  RAISE EXCEPTION 'FAIL: authenticated review RPC not granted'; END IF;
 IF has_table_privilege('authenticated','public.university_review_events','INSERT')
    OR has_table_privilege('authenticated','public.university_review_events','UPDATE')
    OR has_table_privilege('authenticated','public.university_review_events','DELETE')
 THEN RAISE EXCEPTION 'FAIL: audit event client table permits writes'; END IF;
 IF EXISTS (
   SELECT 1 FROM (VALUES
    ('universities','verification_status'),
    ('universities','reviewed_by'),
    ('universities','reviewed_at'),
    ('universities','publication_status'),
    ('universities','published_at'),
    ('university_evidence','review_status'),
    ('university_evidence','checked_by'),
    ('university_evidence','checked_at'),
    ('university_evidence','visibility'),
    ('university_classifications','review_status')
   ) AS sensitive(table_name,column_name)
   WHERE has_column_privilege(
     'authenticated',
     ('public.' || table_name)::regclass,
     column_name,
     'UPDATE'
   )
 ) THEN RAISE EXCEPTION 'FAIL: at least one of 10 review-state columns writable by client'; END IF;
 IF NOT has_column_privilege('authenticated','public.universities',
    'official_name','UPDATE') THEN
  RAISE EXCEPTION 'FAIL: safe draft fields were not preserved'; END IF;
 SELECT count(*) INTO n FROM pg_policies
 WHERE schemaname='public' AND tablename='university_review_events' AND cmd='SELECT';
 IF n <> 1 THEN RAISE EXCEPTION 'FAIL: expected only admin audit SELECT policy'; END IF;
END $preconditions$;

SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
INSERT INTO public.universities
  (id,slug,official_name,country_code,created_by,verification_status,publication_status)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ick-a16-ci-institution',
  'ICK A1.6 CI - NOT A REAL UNIVERSITY','NG',
  '11111111-1111-4111-8111-111111111111','pending_review','draft');
INSERT INTO public.university_evidence
  (id,university_id,claim_type,source_url,review_status,visibility)
VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'identity','https://example.invalid/identity','pending_review','internal'),
 ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'website','https://example.invalid/website','pending_review','internal');

DO $deny_admin_bypass$
DECLARE n integer;
BEGIN
 BEGIN
  UPDATE public.university_evidence
    SET review_status='reviewed'
    WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  RAISE EXCEPTION 'FAIL: Admin direct evidence review-status UPDATE succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.universities SET verification_status='verified'
   WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'FAIL: Admin directly verified institution';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.university_evidence
   (university_id,claim_type,source_url,review_status,checked_by,checked_at)
  VALUES
   ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   'website','https://example.invalid/forged','reviewed',
   '11111111-1111-4111-8111-111111111111',now());
  RAISE EXCEPTION 'FAIL: forged pre-reviewed evidence INSERT';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 BEGIN
  INSERT INTO public.universities
   (slug,official_name,country_code,verification_status)
  VALUES ('ick-a16-forged-verified','FORGED INSTITUTION','NG','verified');
  RAISE EXCEPTION 'FAIL: forged verified university INSERT';
 EXCEPTION WHEN check_violation THEN NULL;
 END;

 UPDATE public.universities SET summary='safe editable draft field'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>1 THEN RAISE EXCEPTION 'FAIL: allowlisted Admin draft UPDATE broken'; END IF;
END $deny_admin_bypass$;

-- A successful reviewed source means a HUMAN claim-specific attestation, not
-- automatic accreditation. Two decisions should create two matching audit rows.
SELECT public.ick_a16_review_evidence(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 'reviewed',
 'Reviewed manually against the cited source and cross-reference.',
 'pending_review'
) AS first_review_event;
SELECT public.ick_a16_review_evidence(
 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
 'rejected',
 'Insufficient independent evidence to establish official control.',
 'pending_review'
) AS second_review_event;

DO $assert_atomic_success$
DECLARE n int;
BEGIN
 -- Reviewed evidence locks the original institution metadata against silent
 -- changes. A future separately audited retraction workflow will unlock it.
 BEGIN
  UPDATE public.universities SET official_name='FAKE UPDATED IDENTITY'
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'FAIL: reviewed institution identity was silently changed';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 SELECT count(*) INTO n FROM public.university_review_events WHERE
   university_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
   AND reviewed_by='11111111-1111-4111-8111-111111111111';
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: expected exactly two audit events, got %',n; END IF;
 SELECT count(*) INTO n FROM public.university_evidence
 WHERE university_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND review_status IN ('reviewed','rejected')
  AND checked_by='11111111-1111-4111-8111-111111111111'
  AND checked_at IS NOT NULL;
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: audit and status not consistent'; END IF;

 SELECT count(*) INTO n FROM public.university_review_events
 WHERE (decision='reviewed' AND new_state='reviewed')
   OR (decision='rejected' AND new_state='rejected');
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: event states do not match decisions'; END IF;

 BEGIN
  PERFORM public.ick_a16_review_evidence(
   'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   'rejected','Outdated contradictory second assessment must fail.', 'pending_review');
  RAISE EXCEPTION 'FAIL: stale second review accepted';
 EXCEPTION WHEN serialization_failure THEN NULL;
 END;
 BEGIN
  PERFORM public.ick_a16_review_evidence(
   'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
   'reviewed','tiny','pending_review');
  RAISE EXCEPTION 'FAIL: missing adequate decision rationale accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 BEGIN
  UPDATE public.university_review_events SET decision='rejected';
  RAISE EXCEPTION 'FAIL: Admin altered append-only audit trail';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  DELETE FROM public.university_review_events;
  RAISE EXCEPTION 'FAIL: Admin deleted audit trail';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $assert_atomic_success$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $normal_user$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.university_evidence;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read nonempty private evidence'; END IF;
 SELECT count(*) INTO n FROM public.university_review_events;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read audit events'; END IF;
 BEGIN
  PERFORM public.ick_a16_review_evidence(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'rejected','Unauthorized review should be denied by role check.',
    'pending_review');
  RAISE EXCEPTION 'FAIL: Normal User used privileged review function';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.university_evidence SET review_status='rejected'
   WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  RAISE EXCEPTION 'FAIL: Normal User direct status UPDATE permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $normal_user$;

RESET ROLE;
SET ROLE anon;
DO $anon$
BEGIN
 BEGIN
  PERFORM public.ick_a16_review_evidence(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'reviewed','Anonymous user must never execute this function.',
    'pending_review');
  RAISE EXCEPTION 'FAIL: anonymous RPC executed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM count(*) FROM public.university_review_events;
  RAISE EXCEPTION 'FAIL: anonymous user can SELECT private audit events';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $anon$;

RESET ROLE;
DO $final_integrity$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.university_review_events;
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: audit events changed after denied attempts'; END IF;
 SELECT count(*) INTO n FROM public.university_evidence
 WHERE review_status='pending_review';
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: pending review unexpectedly remained'; END IF;
 SELECT count(*) INTO n FROM public.universities WHERE
 publication_status='published' OR published_at IS NOT NULL;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: institution was published'; END IF;
END $final_integrity$;
ROLLBACK;
SELECT 'A1.6.2 ISOLATED SOURCE REVIEW SECURITY ACCEPTANCE COMPLETE' AS result;
