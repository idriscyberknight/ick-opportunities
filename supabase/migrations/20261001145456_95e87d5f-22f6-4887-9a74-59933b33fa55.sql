ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'rejected';

CREATE TYPE public.source_type AS ENUM ('scholarship','grant','fellowship','career_page','internship');

CREATE TABLE public.opportunity_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  source_type public.source_type NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_sources TO authenticated;
GRANT ALL ON public.opportunity_sources TO service_role;
ALTER TABLE public.opportunity_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sources" ON public.opportunity_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_sources_updated_at BEFORE UPDATE ON public.opportunity_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.opportunities
  ADD COLUMN source_id uuid REFERENCES public.opportunity_sources(id) ON DELETE SET NULL,
  ADD COLUMN discovered_at timestamptz,
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN published_at timestamptz;
CREATE INDEX opportunities_source_idx ON public.opportunities(source_id);
CREATE INDEX opportunities_link_idx ON public.opportunities(lower(official_link));

CREATE TABLE public.opportunity_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  opportunity_title text,
  source_id uuid REFERENCES public.opportunity_sources(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_id uuid,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.opportunity_audit_logs TO authenticated;
GRANT ALL ON public.opportunity_audit_logs TO service_role;
ALTER TABLE public.opportunity_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.opportunity_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write audit logs" ON public.opportunity_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND actor_id = auth.uid());
CREATE INDEX audit_opp_idx ON public.opportunity_audit_logs(opportunity_id, created_at DESC);