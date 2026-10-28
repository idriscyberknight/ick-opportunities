-- Disposable PostgreSQL 17 CI production-signature fixture only.
-- NEVER run this mock in Lovable or any real Supabase database.
\i tests/a18/production_pg17_minimal_fixture.sql
CREATE SCHEMA supabase_migrations;
CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY);
CREATE TABLE public.university_review_events(id uuid PRIMARY KEY);
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
