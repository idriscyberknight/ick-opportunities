-- A1.8 guarded notification insert — REVIEW ONLY. NOT APPLIED.
-- Purpose: make the consent check, publication check and insert ONE SQL statement,
-- so a consent withdrawal or opportunity withdrawal committed before the statement
-- starts can never produce a new notification (closes the millisecond window left
-- by separate API calls). Additive only; no existing table or row is changed.
-- Callable only by service_role (the scheduled worker). Not callable by users.
--
-- Rollback: DROP FUNCTION public.a18_insert_notifications_guarded(jsonb);

CREATE OR REPLACE FUNCTION public.a18_insert_notifications_guarded(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  WITH input AS (
    SELECT (r->>'user_id')::uuid AS user_id,
           (r->>'opportunity_id')::uuid AS opportunity_id,
           r->>'kind' AS kind,
           r->>'event_key' AS event_key,
           (r->>'lead_days')::int AS lead_days
    FROM jsonb_array_elements(_rows) r
  ), ok AS (
    SELECT i.* FROM input i
    JOIN public.alert_preferences p ON p.user_id = i.user_id
      AND p.enabled
      AND ((i.kind = 'new_match' AND p.new_matches_enabled)
        OR (i.kind = 'saved_deadline' AND p.saved_deadlines_enabled
            AND i.lead_days = ANY (p.deadline_lead_days)))
    JOIN public.opportunities o ON o.id = i.opportunity_id
      AND o.status = 'active'
      AND o.verified_status = 'verified'
      AND o.reviewed_by IS NOT NULL
      AND o.reviewed_at IS NOT NULL
      AND o.published_at IS NOT NULL
      AND o.published_at <= now()
      AND (o.deadline IS NULL OR o.deadline >= (now() AT TIME ZONE p.timezone)::date)
      AND (i.kind <> 'new_match' OR o.category::text = ANY (p.categories::text[]))
    WHERE i.kind <> 'saved_deadline' OR EXISTS (
      SELECT 1 FROM public.saved_opportunities s
      WHERE s.user_id = i.user_id AND s.opportunity_id = i.opportunity_id)
    FOR SHARE OF p, o   -- blocks concurrent consent/publication updates until commit
  )
  INSERT INTO public.user_notifications (user_id, opportunity_id, kind, event_key)
  SELECT user_id, opportunity_id, kind, event_key FROM ok
  ON CONFLICT (user_id, event_key) DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.a18_insert_notifications_guarded(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.a18_insert_notifications_guarded(jsonb) TO service_role;
