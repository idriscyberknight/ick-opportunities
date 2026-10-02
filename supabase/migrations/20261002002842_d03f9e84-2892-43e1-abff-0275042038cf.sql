CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TYPE public.source_health AS ENUM ('unknown','healthy','partial','blocked','error');

ALTER TABLE public.opportunity_sources
  ADD COLUMN health public.source_health NOT NULL DEFAULT 'unknown',
  ADD COLUMN last_success_at timestamptz,
  ADD COLUMN last_found_count integer NOT NULL DEFAULT 0;

-- Single-row settings
CREATE TABLE public.discovery_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  scheduled_enabled boolean NOT NULL DEFAULT true,
  lock_until timestamptz,
  cron_token uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.discovery_settings TO authenticated;
GRANT ALL ON public.discovery_settings TO service_role;
ALTER TABLE public.discovery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read discovery settings" ON public.discovery_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update discovery settings" ON public.discovery_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
REVOKE SELECT (cron_token) ON public.discovery_settings FROM authenticated;
REVOKE SELECT ON public.discovery_settings FROM authenticated;
GRANT SELECT (id, scheduled_enabled, lock_until, updated_at) ON public.discovery_settings TO authenticated;
REVOKE UPDATE ON public.discovery_settings FROM authenticated;
GRANT UPDATE (scheduled_enabled, updated_at) ON public.discovery_settings TO authenticated;
INSERT INTO public.discovery_settings (id) VALUES (true);

CREATE TABLE public.discovery_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL CHECK (trigger IN ('manual','scheduled')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','partial','failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  sources_checked integer NOT NULL DEFAULT 0,
  found integer NOT NULL DEFAULT 0,
  added integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  stopped_reason text,
  actor_id uuid,
  acknowledged boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.discovery_runs TO authenticated;
GRANT ALL ON public.discovery_runs TO service_role;
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discovery runs" ON public.discovery_runs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX discovery_runs_started_idx ON public.discovery_runs (started_at DESC);

CREATE TABLE public.discovery_run_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.discovery_runs(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.opportunity_sources(id) ON DELETE SET NULL,
  source_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer,
  found integer NOT NULL DEFAULT 0,
  added integer NOT NULL DEFAULT 0,
  duplicates integer NOT NULL DEFAULT 0,
  health public.source_health NOT NULL,
  error text
);
GRANT SELECT, INSERT ON public.discovery_run_sources TO authenticated;
GRANT ALL ON public.discovery_run_sources TO service_role;
ALTER TABLE public.discovery_run_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read run sources" ON public.discovery_run_sources FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert run sources" ON public.discovery_run_sources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX discovery_run_sources_run_idx ON public.discovery_run_sources (run_id);
CREATE INDEX discovery_run_sources_started_idx ON public.discovery_run_sources (started_at DESC);