-- A1.6.2 isolated upgrade fixture, PostgreSQL 17 in disposable GitHub Actions DB.
-- This reproduces the current LIVE AGGREGATE state: 1 draft, 1 alias, 1 pending evidence.
-- The rows, user identifiers and source URLs below are purely SYNTHETIC.
-- DO NOT EXECUTE IN LOVABLE CLOUD OR ANY PRODUCTION/STAGING DATABASE.
\set ON_ERROR_STOP on

INSERT INTO auth.users(id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.user_roles(user_id,role) VALUES
  ('11111111-1111-4111-8111-111111111111','admin');

SET ROLE authenticated;
SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';

INSERT INTO public.universities
 (id,slug,official_name,country_code,created_by,verification_status,publication_status)
VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'ick-ci-existing-draft-not-a-real-university',
  'ICK SYNTHETIC UPGRADE FIXTURE - NOT A REAL UNIVERSITY', 'NG',
  '11111111-1111-4111-8111-111111111111',
  'pending_review','draft');

INSERT INTO public.university_aliases(id,university_id,alias,language_code)
VALUES (
 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'ICK Synthetic University Alias', 'en'
);

INSERT INTO public.university_evidence
 (id,university_id,claim_type,source_url,review_status,visibility)
VALUES
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'identity','https://example.invalid/only-ci-fixture',
  'pending_review','internal');

RESET ROLE;
RESET request.jwt.claim.sub;

DO $fixture$
BEGIN
 IF (SELECT count(*) FROM public.universities)<>1 OR
    (SELECT count(*) FROM public.university_aliases)<>1 OR
    (SELECT count(*) FROM public.university_evidence)<>1 OR
    (SELECT count(*) FROM public.university_classifications)<>0
 THEN RAISE EXCEPTION 'FAIL: upgrade fixture must be exactly 1/1/1/0'; END IF;
 IF (SELECT count(*) FROM public.universities
    WHERE verification_status='pending_review' AND publication_status='draft')<>1
 THEN RAISE EXCEPTION 'FAIL: seed university must remain private draft'; END IF;
 IF (SELECT count(*) FROM public.university_evidence
    WHERE review_status='pending_review' AND checked_at IS NULL AND checked_by IS NULL)<>1
 THEN RAISE EXCEPTION 'FAIL: seeded evidence must be pending'; END IF;
 IF to_regclass('public.university_review_events') IS NOT NULL
 THEN RAISE EXCEPTION 'FAIL: fixture unexpectedly has A1.6 events table'; END IF;
END $fixture$;

SELECT 'A16_SYNTHETIC_EXISTING_DRAFT_SEEDED' AS result;
