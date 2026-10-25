-- A1.5 ISOLATED CI ONLY.
-- Test admin DRAFT persistence and authenticated non-admin/anon SQL authorization
-- using simulated claims in a disposable PostgreSQL 17 container.
-- This is NOT an actual JWT/HTTP test; production tables are never accessed.
\set ON_ERROR_STOP on

BEGIN;
INSERT INTO auth.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.user_roles (user_id,role) VALUES
  ('11111111-1111-4111-8111-111111111111','admin');

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

DO $$
BEGIN
  IF auth.uid() IS DISTINCT FROM '11111111-1111-4111-8111-111111111111'::uuid
     OR NOT public.has_role(auth.uid(),'admin'::public.app_role)
  THEN RAISE EXCEPTION 'FAIL: synthetic admin role setup'; END IF;
END $$;

INSERT INTO public.universities (id,slug,official_name,country_code,created_by)
VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ick-ci-university-a','ICK CI Test School A','NG','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','ick-ci-university-b','ICK CI Test School B','NG','11111111-1111-4111-8111-111111111111');

INSERT INTO public.university_aliases (id,university_id,alias)
VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','ICK CI School Alias');

INSERT INTO public.university_evidence (id,university_id,claim_type,source_url,review_status)
VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'identity','https://example.invalid/test-only','pending_review');

INSERT INTO public.university_classifications
 (id,university_id,classification_key,evidence_id)
VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','general_institution',
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd');

UPDATE public.universities SET summary='CI-only updated draft'
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

DO $$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM public.universities
 WHERE publication_status='draft' AND verification_status='pending_review';
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: admin draft insert/read returned %, expected 2',n; END IF;
 SELECT count(*) INTO n FROM public.universities
 WHERE summary='CI-only updated draft';
 IF n<>1 THEN RAISE EXCEPTION 'FAIL: admin draft UPDATE was not persisted'; END IF;
 SELECT
    (SELECT count(*) FROM public.university_aliases)
  + (SELECT count(*) FROM public.university_evidence)
  + (SELECT count(*) FROM public.university_classifications)
 INTO n;
 IF n<>3 THEN RAISE EXCEPTION 'FAIL: alias/evidence/classification inserts'; END IF;

 -- Wrong-institution evidence cannot be attached to another university.
 BEGIN
  INSERT INTO public.university_classifications
    (university_id, classification_key, evidence_id)
  VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','general_institution',
          'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  RAISE EXCEPTION 'FAIL: cross-university classification was accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL;
 END;

 -- Even an Admin cannot publish before the separately approved release gate.
 BEGIN
  INSERT INTO public.universities (slug,official_name,country_code,publication_status)
  VALUES ('ick-ci-improper-publish','Unsafe CI entry','NG','published');
  RAISE EXCEPTION 'FAIL: public publication was accepted';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
END $$;

RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

DO $$
DECLARE
 n int;
 tbl text;
BEGIN
 IF public.has_role(auth.uid(),'admin'::public.app_role)
 THEN RAISE EXCEPTION 'FAIL: normal CI user was treated as Admin'; END IF;

 FOREACH tbl IN ARRAY ARRAY[
   'universities','university_aliases','university_evidence','university_classifications'
 ] LOOP
   EXECUTE format('SELECT count(*) FROM public.%I',tbl) INTO n;
   IF n<>0 THEN RAISE EXCEPTION 'FAIL: normal user read % rows from %',n,tbl; END IF;
 END LOOP;

 -- INSERT attempts use valid FK data where applicable so RLS is decisive.
 BEGIN
   INSERT INTO public.universities(slug,official_name,country_code)
   VALUES ('ick-ci-normal-attempt','Unauthorized','NG');
   RAISE EXCEPTION 'FAIL: normal user inserted a university';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   INSERT INTO public.university_aliases(university_id,alias)
   VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Unauthorized');
   RAISE EXCEPTION 'FAIL: normal user inserted an alias';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   INSERT INTO public.university_evidence(university_id,claim_type,source_url)
   VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','identity','https://example.invalid/blocked');
   RAISE EXCEPTION 'FAIL: normal user inserted evidence';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   INSERT INTO public.university_classifications(university_id,classification_key,evidence_id)
   VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','islamic_institution',
           'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
   RAISE EXCEPTION 'FAIL: normal user inserted classification';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;

 UPDATE public.universities SET summary='UNAUTHORIZED' WHERE
   id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: normal user updated university'; END IF;

 UPDATE public.university_aliases SET alias='UNAUTHORIZED' WHERE
   id='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: normal user updated alias'; END IF;

 UPDATE public.university_evidence SET source_title='UNAUTHORIZED' WHERE
   id='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: normal user updated evidence'; END IF;

 UPDATE public.university_classifications SET review_status='rejected' WHERE
   id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL: normal user updated classification'; END IF;

 BEGIN
   DELETE FROM public.universities WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
   RAISE EXCEPTION 'FAIL: DELETE permitted to normal user';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;

RESET ROLE;
SET ROLE anon;
DO $$
BEGIN
 BEGIN
  PERFORM count(*) FROM public.universities;
  RAISE EXCEPTION 'FAIL: anon SELECT permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  INSERT INTO public.universities(slug,official_name,country_code)
  VALUES ('ick-ci-anon-attempt','Unauthorized','NG');
  RAISE EXCEPTION 'FAIL: anon INSERT permitted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;

RESET ROLE;
DO $$
DECLARE n int;
BEGIN
 SELECT count(*) INTO n FROM public.universities;
 IF n<>2 THEN RAISE EXCEPTION 'FAIL: fixture count mutated by unauthorized account: %',n; END IF;
END $$;

ROLLBACK;
-- Test data never persists even in the disposable CI database.
SELECT 'A1.5 ISOLATED POSTGRES ROLE/ROW FIXTURE TESTS COMPLETE' AS result;
