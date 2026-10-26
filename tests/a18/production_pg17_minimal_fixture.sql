-- A1.8 PRODUCTION DESIGN CI ONLY: disposable PostgreSQL 17 mock, never any Lovable Cloud DB.
-- This is a faithful MOCK of selected Supabase auth/RLS SQL constructs.
-- Session claim simulation is NOT cryptographic JWT or PostgREST testing.
\set ON_ERROR_STOP 1

-- PostgreSQL roles belong to the cluster, not an individual database.
-- Tests bootstrap both positive and negative databases in the same CI cluster.
DO $a18_roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$a18_roles$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog
AS $fn$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $fn$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TYPE public.opportunity_category AS ENUM ('scholarship','job','internship','grant');
CREATE TYPE public.opportunity_status AS ENUM ('active','draft','expired','rejected');
CREATE TYPE public.verified_status AS ENUM ('verified','pending_review');

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY,
  status public.opportunity_status NOT NULL DEFAULT 'draft',
  verified_status public.verified_status NOT NULL DEFAULT 'pending_review',
  reviewed_at timestamptz,
  reviewed_by uuid,
  published_at timestamptz,
  deadline date
);
CREATE TABLE public.saved_opportunities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id)
);
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read_reviewed_opportunities
ON public.opportunities FOR SELECT TO anon, authenticated USING (
  status='active' AND verified_status='verified'
  AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL
  AND published_at IS NOT NULL AND published_at <= now()
  AND (deadline IS NULL OR deadline >= CURRENT_DATE)
);
GRANT SELECT ON TABLE public.opportunities TO anon, authenticated;

INSERT INTO auth.users(id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.opportunities(id,status,verified_status,reviewed_at,reviewed_by,published_at,deadline) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active','verified',now(),'11111111-1111-4111-8111-111111111111',now()-interval '1 day',CURRENT_DATE+7),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','draft','pending_review',null,null,null,CURRENT_DATE+7),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','active','verified',now(),'11111111-1111-4111-8111-111111111111',now()-interval '5 day',CURRENT_DATE-1),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','active','verified',now(),'11111111-1111-4111-8111-111111111111',now()+interval '1 day',CURRENT_DATE+7);

-- Mock Production saved_opportunities RLS (verified enabled on 2026-10-26).
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;

-- Deliberately recreate the Lovable broad *default* new-table grants.
-- The Production candidate must revoke these grants explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated;
