-- A1.6.2 isolated migration compatibility + rollback of editorial decisions.
-- Only disposable GitHub Actions PostgreSQL; NO Lovable Production access.
-- Expected: existing 1 university / 1 alias / 1 pending evidence survives DDL.
\set ON_ERROR_STOP on

DO $post_upgrade$
BEGIN
 IF (SELECT count(*) FROM public.universities)<>1 OR
    (SELECT count(*) FROM public.university_aliases)<>1 OR
    (SELECT count(*) FROM public.university_evidence)<>1 OR
    (SELECT count(*) FROM public.university_classifications)<>0
 THEN RAISE EXCEPTION 'FAIL: migration changed preexisting registry fixture counts'; END IF;
 IF to_regclass('public.university_review_events') IS NULL
 THEN RAISE EXCEPTION 'FAIL: review events table absent after prototype'; END IF;
 IF (SELECT count(*) FROM pg_constraint
   WHERE conrelid='public.universities'::regclass AND
     conname='universities_no_publishing_yet' AND convalidated)<>1
 THEN RAISE EXCEPTION 'FAIL: university publication guard missing'; END IF;
 IF (SELECT count(*) FROM pg_policies
   WHERE schemaname='public' AND tablename IN
    ('universities','university_aliases','university_evidence',
     'university_classifications'))<>12
 THEN RAISE EXCEPTION 'FAIL: original 12 admin registry policies changed'; END IF;
END $post_upgrade$;

BEGIN;
SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';

-- A1.6.2-compatible A1.5 editor sends ONLY safe fields. A user may continue
-- managing a pending, unpublished draft. No review metadata is touched.
UPDATE public.universities
 SET official_name='ICK SYNTHETIC DRAFT AFTER UPGRADE',
     country_code='NG',
     city='CI-only city',
     official_website='https://example.invalid/ci-only-university',
     summary='This is not a real university, only an upgrade regression.'
WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND publication_status='draft'
  AND verification_status='pending_review';

DO $editor$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.universities
 WHERE official_name='ICK SYNTHETIC DRAFT AFTER UPGRADE' AND
       city='CI-only city' AND
       verification_status='pending_review' AND
       reviewed_at IS NULL AND reviewed_by IS NULL;
 IF n<>1 THEN RAISE EXCEPTION 'FAIL: safe draft PATCH regression'; END IF;
 BEGIN
  UPDATE public.universities
     SET verification_status='verified'
   WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'FAIL: direct Admin verified status edit bypassed audit';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.university_evidence SET review_status='reviewed'
  WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  RAISE EXCEPTION 'FAIL: direct Admin evidence review-status edit permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $editor$;

-- A separate decision is made by server-side role-checked transaction.
SELECT public.ick_a16_review_evidence(
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 'reviewed',
 'CI-only human-reviewed demonstration; no real accreditation implied.',
 'pending_review') AS audit_id;

DO $verify_event$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.university_review_events
 WHERE evidence_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  AND university_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND decision='reviewed' AND previous_state='pending_review'
  AND new_state='reviewed'
  AND reviewed_by='11111111-1111-4111-8111-111111111111';
 IF n<>1 THEN RAISE EXCEPTION 'FAIL: exactly one matching audit event required'; END IF;
 IF (SELECT count(*) FROM public.university_evidence
     WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND
       review_status='reviewed' AND checked_at IS NOT NULL AND
       checked_by='11111111-1111-4111-8111-111111111111')<>1
 THEN RAISE EXCEPTION 'FAIL: reviewed status must match audit event'; END IF;
 BEGIN
  UPDATE public.universities
    SET official_name='FORGED IDENTITY AFTER REVIEW'
  WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE EXCEPTION 'FAIL: reviewed source left institution identity editable';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $verify_event$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
DO $isolation$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM public.universities;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read preexisting private draft'; END IF;
 SELECT count(*) INTO n FROM public.university_aliases;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read preexisting aliases'; END IF;
 SELECT count(*) INTO n FROM public.university_evidence;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read preexisting private evidence'; END IF;
 SELECT count(*) INTO n FROM public.university_review_events;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: Normal User read private audit decision'; END IF;
 BEGIN
  PERFORM public.ick_a16_review_evidence(
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'rejected','Unauthorized review denied by database policy and function.',
    'pending_review');
  RAISE EXCEPTION 'FAIL: Normal User issued review decision';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $isolation$;

RESET ROLE;
ROLLBACK; -- Roll back ALL test edits + review event; existing fixture remains.

-- The schema remains upgraded, but the existing unreviewed data is unchanged.
DO $final$
BEGIN
 IF (SELECT count(*) FROM public.universities
    WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND official_name='ICK SYNTHETIC UPGRADE FIXTURE - NOT A REAL UNIVERSITY'
      AND summary IS NULL AND reviewed_by IS NULL
      AND verification_status='pending_review' AND publication_status='draft')<>1
 THEN RAISE EXCEPTION 'FAIL: testing transaction changed original institution'; END IF;
 IF (SELECT count(*) FROM public.university_evidence
    WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      AND review_status='pending_review' AND checked_at IS NULL
      AND checked_by IS NULL)<>1
 THEN RAISE EXCEPTION 'FAIL: testing transaction changed original evidence'; END IF;
 IF (SELECT count(*) FROM public.university_aliases)<>1
 THEN RAISE EXCEPTION 'FAIL: testing transaction dropped existing alias'; END IF;
 IF (SELECT count(*) FROM public.university_review_events)<>0
 THEN RAISE EXCEPTION 'FAIL: review trial left audit event persisted'; END IF;
END $final$;
SELECT 'A16_EXISTING_DRAFT_UPGRADE_AND_TEST_ROLLBACK_PASS' AS result;
