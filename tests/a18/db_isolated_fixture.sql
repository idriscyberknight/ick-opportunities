-- ISOLATED CI FIXTURE ONLY. Disposable container, never Lovable Cloud.
-- Mimics only the narrow PostgreSQL role/context boundary of Supabase.
-- SET request.jwt.claim.sub in these tests is NOT a cryptographically signed JWT.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path = pg_catalog
  AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;

CREATE TYPE public.opportunity_category AS ENUM ('scholarship','job','internship','grant');
CREATE TABLE public.opportunities (id uuid PRIMARY KEY);

INSERT INTO auth.users(id)
VALUES ('11111111-1111-4111-8111-111111111111'),
       ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.opportunities(id)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
