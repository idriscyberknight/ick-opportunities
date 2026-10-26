-- ISOLATED PG16 adversarial policy/grant tests, NOT real JWT tests.
-- Execution order: fixture -> prototype -> this file.
\set ON_ERROR_STOP 1

DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.alert_preferences'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.user_notifications'::regclass)
  THEN RAISE EXCEPTION 'RLS must be enabled on both tables'; END IF;

  IF has_table_privilege('anon','public.alert_preferences','SELECT')
    OR has_table_privilege('anon','public.user_notifications','SELECT')
  THEN RAISE EXCEPTION 'Anonymous table privileges must be revoked'; END IF;

  IF has_table_privilege('authenticated','public.user_notifications','INSERT')
    OR has_table_privilege('authenticated','public.user_notifications','DELETE')
    OR has_table_privilege('authenticated','public.user_notifications','TRUNCATE')
  THEN RAISE EXCEPTION 'Normal users must not write or truncate notification rows'; END IF;

  IF has_column_privilege('authenticated','public.user_notifications','user_id','UPDATE')
    OR has_column_privilege('authenticated','public.user_notifications','event_key','UPDATE')
    OR has_column_privilege('authenticated','public.user_notifications','opportunity_id','UPDATE')
  THEN RAISE EXCEPTION 'Immutable notification identity fields must not be writable'; END IF;

  IF NOT has_column_privilege('authenticated','public.user_notifications','read_at','UPDATE')
    OR NOT has_column_privilege('authenticated','public.user_notifications','dismissed_at','UPDATE')
  THEN RAISE EXCEPTION 'Read and dismiss columns should be user-editable'; END IF;
END $$;

-- Seed in disposable CI database using DB owner (NOT a production backend).
INSERT INTO public.user_notifications(user_id,opportunity_id,kind,event_key)
VALUES
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','new_match','match:A'),
('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','new_match','match:B');

-- A normal role acts as user A using a role+session-claim SIMULATION.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.alert_preferences(user_id,enabled,categories)
VALUES ('11111111-1111-4111-8111-111111111111',true,
        ARRAY['scholarship']::public.opportunity_category[]);

DO $$
DECLARE n integer;
DECLARE affected integer;
DECLARE denied boolean;
BEGIN
  SELECT count(*) INTO n FROM public.alert_preferences;
  IF n <> 1 THEN RAISE EXCEPTION 'User A should see only own prefs'; END IF;

  SELECT count(*) INTO n FROM public.user_notifications;
  IF n <> 1 THEN RAISE EXCEPTION 'User A should see only own notification'; END IF;

  UPDATE public.user_notifications SET read_at=now()
   WHERE user_id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'A changed B notification'; END IF;

  UPDATE public.user_notifications SET read_at=now()
   WHERE user_id='11111111-1111-4111-8111-111111111111';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'A could not mark own notification read'; END IF;

  DELETE FROM public.alert_preferences
   WHERE user_id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'A deleted B preference'; END IF;

  denied := false;
  BEGIN
    INSERT INTO public.alert_preferences(user_id)
    VALUES ('22222222-2222-4222-8222-222222222222');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'A inserted B preferences'; END IF;

  denied := false;
  BEGIN
    UPDATE public.alert_preferences
      SET user_id='33333333-3333-4333-8333-333333333333'
      WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'A reassigned preference ownership'; END IF;

  denied := false;
  BEGIN
    INSERT INTO public.user_notifications(user_id,opportunity_id,kind,event_key)
    VALUES ('11111111-1111-4111-8111-111111111111',
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','new_match','spoof');
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Client created forged notification'; END IF;

  denied := false;
  BEGIN
    UPDATE public.user_notifications SET event_key='spoofed'
     WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Client rewrote notification event_key'; END IF;

  denied := false;
  BEGIN
    INSERT INTO public.alert_preferences(user_id,minimum_match_score)
    VALUES ('33333333-3333-4333-8333-333333333333',101);
  EXCEPTION WHEN others THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Invalid score accepted'; END IF;
END $$;

RESET ROLE;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
SET ROLE authenticated;

INSERT INTO public.alert_preferences(user_id)
VALUES ('22222222-2222-4222-8222-222222222222');

DO $$
DECLARE n integer;
DECLARE current_enabled boolean;
BEGIN
  SELECT count(*) INTO n FROM public.user_notifications;
  IF n <> 1 THEN RAISE EXCEPTION 'User B should see exactly one own notification'; END IF;
  SELECT count(*),bool_or(enabled) INTO n,current_enabled FROM public.alert_preferences;
  IF n <> 1 OR current_enabled IS DISTINCT FROM false
  THEN RAISE EXCEPTION 'User B must see own preference only, disabled by default'; END IF;
END $$;

-- Claims with no identity cannot access either owner's data.
RESET ROLE;
SET request.jwt.claim.sub = '';
SET ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.alert_preferences) <> 0
     OR (SELECT count(*) FROM public.user_notifications) <> 0
  THEN RAISE EXCEPTION 'Missing auth uid leaked owner rows'; END IF;
END $$;

-- Anonymous role has no SELECT grants even if a forged text setting exists.
RESET ROLE;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
SET ROLE anon;
DO $$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    PERFORM count(*) FROM public.user_notifications;
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous read notification rows'; END IF;

  denied := false;
  BEGIN
    PERFORM count(*) FROM public.alert_preferences;
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Anonymous read preferences'; END IF;
END $$;

RESET ROLE;
-- Unique(user_id,event_key) must reject duplicates; same key for B is permitted.
DO $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.user_notifications(user_id,opportunity_id,kind,event_key)
    VALUES ('11111111-1111-4111-8111-111111111111',
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','new_match','match:A');
  EXCEPTION WHEN unique_violation THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Duplicate notification event accepted'; END IF;
END $$;

INSERT INTO public.user_notifications(user_id,opportunity_id,kind,event_key)
VALUES ('22222222-2222-4222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','new_match','match:A');

-- Bad days and category duplicates blocked by DB constraints.
DO $a18check$
DECLARE denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.alert_preferences SET deadline_lead_days=ARRAY[1,1,7]::smallint[]
    WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Duplicate deadline milestones accepted'; END IF;

  denied := false;
  BEGIN
    UPDATE public.alert_preferences
      SET categories=ARRAY['scholarship','scholarship']::public.opportunity_category[]
      WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Duplicate categories accepted'; END IF;

  denied := false;
  BEGIN
    UPDATE public.alert_preferences SET minimum_match_score=101
      WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Score above 100 accepted'; END IF;

  denied := false;
  BEGIN
    UPDATE public.alert_preferences SET categories=ARRAY[NULL]::public.opportunity_category[]
      WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'NULL opportunity category accepted'; END IF;

  denied := false;
  BEGIN
    UPDATE public.alert_preferences SET deadline_lead_days=ARRAY[NULL]::smallint[]
      WHERE user_id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN check_violation THEN denied := true; END;
  IF NOT denied THEN RAISE EXCEPTION 'NULL reminder milestone accepted'; END IF;
END $a18check$;

\echo 'PASS: isolated PG16 grants, RLS ownership, default off, spoof denial and dedupe'
