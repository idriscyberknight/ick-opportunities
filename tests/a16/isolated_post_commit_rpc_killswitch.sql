-- A1.6.2 ISOLATED POST-COMMIT INCIDENT CONTAINMENT REHEARSAL
-- Run ONLY in a disposable CI database AFTER applying the review prototype.
-- This is NOT a Production rollback, export restore, or approval to run SQL.
\set ON_ERROR_STOP on
BEGIN;

-- A controlled incident response can immediately disable review decisions
-- without deleting append-only audit evidence or restoring broad UPDATE grants.
REVOKE EXECUTE ON FUNCTION public.ick_a16_review_evidence(uuid,text,text,text)
  FROM authenticated;

DO $a16_disable$
DECLARE
  v_count int;
BEGIN
 IF has_function_privilege('authenticated',
      'public.ick_a16_review_evidence(uuid,text,text,text)','EXECUTE')
 THEN
   RAISE EXCEPTION 'FAIL: review RPC remains executable after kill switch';
 END IF;
 IF has_function_privilege('anon',
      'public.ick_a16_review_evidence(uuid,text,text,text)','EXECUTE')
 THEN
   RAISE EXCEPTION 'FAIL: anon review RPC privilege appeared';
 END IF;
 IF has_column_privilege('authenticated','public.university_evidence',
        'review_status','UPDATE')
 THEN
   RAISE EXCEPTION 'FAIL: disabling RPC re-enabled direct status bypass';
 END IF;
 SELECT count(*) INTO v_count FROM public.university_review_events;
 IF v_count<>0 THEN RAISE EXCEPTION 'FAIL: audit data changed'; END IF;
END $a16_disable$;

SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
DO $a16_admin_denied$
DECLARE
  v_count int;
BEGIN
 BEGIN
   PERFORM public.ick_a16_review_evidence(
     'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
     'reviewed','Safe kill-switch rehearsal has no authorization to approve.',
     'pending_review');
   RAISE EXCEPTION 'FAIL: Admin review was allowed with kill switch enabled';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 -- Ordinary safe draft edits should remain possible during containment.
 UPDATE public.universities SET summary='A1.6.2 safe review-paused draft'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
   AND publication_status='draft'
   AND verification_status='pending_review';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF v_count<>1 THEN
   RAISE EXCEPTION 'FAIL: safe draft edit blocked by RPC kill switch';
 END IF;
END $a16_admin_denied$;
RESET ROLE;
RESET request.jwt.claim.sub;

-- Re-enabling requires a separate authorized change. This part tests that
-- grant state can be reversibly paused with no audit/data deletion.
GRANT EXECUTE ON FUNCTION public.ick_a16_review_evidence(uuid,text,text,text)
  TO authenticated;
DO $a16_reenable$
BEGIN
 IF NOT has_function_privilege('authenticated',
      'public.ick_a16_review_evidence(uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'FAIL: controlled RPC re-enable did not work'; END IF;
 IF has_function_privilege('anon',
      'public.ick_a16_review_evidence(uuid,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'FAIL: re-enable granted anonymous RPC execute'; END IF;
END $a16_reenable$;

ROLLBACK;
-- Transaction rollback leaves isolated CI schema + baseline data unchanged.
DO $a16_zero_effect$
BEGIN
 IF (SELECT count(*) FROM public.universities)<>1 OR
    (SELECT count(*) FROM public.university_aliases)<>1 OR
    (SELECT count(*) FROM public.university_evidence)<>1 OR
    (SELECT count(*) FROM public.university_review_events)<>0
 THEN RAISE EXCEPTION 'FAIL: post-commit rehearsal affected fixture counts'; END IF;
END $a16_zero_effect$;
SELECT 'A16_RPC_CONTAINMENT_REHEARSAL_PASS' AS result;
