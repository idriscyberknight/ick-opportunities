-- ICK OPPORTUNITIES — GLOBAL UNIVERSITY REGISTRY
-- PHASE 3B.3B / SECURITY-FIRST SCHEMA DRAFT (2026-10-23)
-- REVIEW ONLY. DO NOT RUN AGAINST PRODUCTION OR PASTE INTO LOVABLE SQL EDITOR.
-- DO NOT MOVE INTO supabase/migrations UNTIL an isolated staging DB and
-- the exact authoritative Supabase project/ref + deployment runner are verified.
-- Not tested on a PostgreSQL server. Requires a staging syntax/privilege test.
-- Design decision: initial deployment is CLOSED to public and DOES NOT ALLOW
-- any university to be published. Publishing requires a later reviewed migration.
-- No opportunity/auth/admin table is modified in this draft.

BEGIN;

-- A) Stable institutional identity.
CREATE TABLE public.universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  official_name text NOT NULL,
  country_code text NOT NULL,
  city text,
  official_website text,
  summary text,
  ror_id text UNIQUE,
  verification_status text NOT NULL DEFAULT 'pending_review',
  publication_status text NOT NULL DEFAULT 'draft',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT universities_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT universities_name_not_blank CHECK (length(btrim(official_name)) > 0),
  CONSTRAINT universities_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT universities_website_https CHECK (
    official_website IS NULL OR official_website ~ '^https://[^[:space:]]+$'
  ),
  CONSTRAINT universities_verification_state CHECK (
    verification_status IN ('pending_review','verified','needs_reverification','rejected')
  ),
  CONSTRAINT universities_publication_state CHECK (
    publication_status IN ('draft','published','archived')
  ),
  -- Fail-closed migration gate. Stage 3B.3F must remove this ONLY alongside
  -- atomic evidence-backed publishing controls and public-read RLS policies.
  CONSTRAINT universities_no_publishing_yet CHECK (
    publication_status <> 'published' AND published_at IS NULL
  )
);

CREATE INDEX universities_country_code_idx ON public.universities(country_code);
CREATE INDEX universities_publication_idx ON public.universities(publication_status, verification_status);

-- B) Names in Arabic/English/French etc; abbreviations are NOT globally unique.
CREATE TABLE public.university_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  alias text NOT NULL,
  language_code text,
  script_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT university_alias_not_blank CHECK (length(btrim(alias)) > 0),
  CONSTRAINT university_alias_language_length CHECK (
    language_code IS NULL OR length(language_code) BETWEEN 2 AND 35
  )
);
CREATE UNIQUE INDEX university_aliases_per_university_normalized_idx
  ON public.university_aliases (university_id, lower(btrim(alias)));
CREATE INDEX university_aliases_university_id_idx
  ON public.university_aliases(university_id);

-- C) Claim-specific sources: creating a record is NOT equivalent to checking it.
CREATE TABLE public.university_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  claim_type text NOT NULL,
  source_url text NOT NULL,
  source_title text,
  checked_at timestamptz,
  checked_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  review_status text NOT NULL DEFAULT 'pending_review',
  visibility text NOT NULL DEFAULT 'internal',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT university_evidence_claim_type CHECK (
    claim_type IN ('identity','website','classification','programmes','accreditation','other')
  ),
  CONSTRAINT university_evidence_https CHECK (source_url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT university_evidence_review_state CHECK (
    review_status IN ('pending_review','reviewed','rejected')
  ),
  CONSTRAINT university_evidence_visibility CHECK (visibility IN ('internal','public')),
  CONSTRAINT university_evidence_review_metadata CHECK (
    review_status <> 'reviewed' OR (checked_at IS NOT NULL AND checked_by IS NOT NULL)
  ),
  CONSTRAINT university_evidence_id_institution_unique UNIQUE(id, university_id)
);
CREATE INDEX university_evidence_university_idx
  ON public.university_evidence(university_id, review_status);

-- D) Many-to-many categorical claims, tied to evidence of the SAME university.
CREATE TABLE public.university_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE RESTRICT,
  classification_key text NOT NULL,
  evidence_id uuid NOT NULL,
  review_status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT university_classifications_key CHECK (
    classification_key IN (
      'islamic_institution','islamic_studies_provider','general_institution'
    )
  ),
  CONSTRAINT university_classifications_review_state CHECK (
    review_status IN ('pending_review','reviewed','rejected')
  ),
  CONSTRAINT university_classifications_same_university_evidence FOREIGN KEY
    (evidence_id, university_id)
    REFERENCES public.university_evidence (id, university_id) ON DELETE RESTRICT,
  CONSTRAINT university_classifications_unique_key UNIQUE (university_id, classification_key)
);
CREATE INDEX university_classifications_evidence_idx
  ON public.university_classifications(evidence_id);

-- Maintain update timestamps via isolated trigger function (not a client RPC).
CREATE FUNCTION public.ick_university_registry_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ick_university_registry_touch_updated_at()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER universities_touch_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.ick_university_registry_touch_updated_at();
CREATE TRIGGER university_classifications_touch_updated_at
  BEFORE UPDATE ON public.university_classifications
  FOR EACH ROW EXECUTE FUNCTION public.ick_university_registry_touch_updated_at();

-- Defensive privilege reset: default ACLs have historically been overbroad.
REVOKE ALL ON TABLE
  public.universities,
  public.university_aliases,
  public.university_evidence,
  public.university_classifications
FROM PUBLIC, anon, authenticated;

-- Admin accounts are JWT role 'authenticated', distinguished by RLS helper.
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.universities,
  public.university_aliases,
  public.university_evidence,
  public.university_classifications
TO authenticated;

GRANT ALL ON TABLE
  public.universities,
  public.university_aliases,
  public.university_evidence,
  public.university_classifications
TO service_role;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_classifications ENABLE ROW LEVEL SECURITY;

-- Admin-only policies, with ZERO public SELECT in this first schema stage.
-- Direct INSERT/UPDATE/DELETE by ordinary users are denied; DELETE has no grant.
CREATE POLICY university_admin_select ON public.universities
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_admin_insert ON public.universities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_admin_update ON public.universities
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY university_alias_admin_select ON public.university_aliases
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_alias_admin_insert ON public.university_aliases
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_alias_admin_update ON public.university_aliases
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY university_evidence_admin_select ON public.university_evidence
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_evidence_admin_insert ON public.university_evidence
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_evidence_admin_update ON public.university_evidence
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY university_classification_admin_select ON public.university_classifications
  FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_classification_admin_insert ON public.university_classifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY university_classification_admin_update ON public.university_classifications
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

COMMIT;

-- NOT INCLUDED: public read policies, publication RPC, university audit logging,
-- evidence retraction triggers, university data import, scholar matching,
-- opportunity publication policy changes, or a data backfill.
-- They must be reviewed and staged separately before any institution is published.
