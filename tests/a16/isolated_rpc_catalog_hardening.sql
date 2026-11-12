-- A1.6.2 disposable Postgres-only catalog hardening assertions.
-- It tests the isolated PROTOTYPE, NOT the as-yet-uninstalled Production RPC.
-- All assertions are read-only; this file does NOT authorize deployment.
\set ON_ERROR_STOP on
DO $rpc_security$
DECLARE
 v_fn oid := to_regprocedure('public.ick_a16_review_evidence(uuid,text,text,text)');
 v_audit_table oid := to_regclass('public.university_review_events');
 v_policy_count integer;
 v_trigger_count integer;
BEGIN
 IF v_fn IS NULL OR v_audit_table IS NULL
 THEN RAISE EXCEPTION 'FAIL: A1.6.2 function or events table missing'; END IF;

 IF NOT EXISTS (
   SELECT 1 FROM pg_proc p WHERE p.oid=v_fn AND p.prosecdef
     AND EXISTS (SELECT 1 FROM unnest(p.proconfig) AS setting
                 WHERE setting IN ('search_path=','search_path=""'))
 ) THEN
   RAISE EXCEPTION 'FAIL: review function is not SECURITY DEFINER with empty pinned search_path';
 END IF;

 -- This specifically checks PostgreSQL's PUBLIC (=0) function grant, not a
 -- mistaken assumption that explicit authenticated EXECUTE removes PUBLIC.
 IF EXISTS (
   SELECT 1 FROM pg_proc p
   CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) acl
   WHERE p.oid=v_fn AND acl.grantee=0 AND acl.privilege_type='EXECUTE'
 ) THEN
   RAISE EXCEPTION 'FAIL: privileged review RPC inherits PUBLIC EXECUTE';
 END IF;
 IF has_function_privilege('anon',v_fn,'EXECUTE') THEN
   RAISE EXCEPTION 'FAIL: anon can call privileged review RPC';
 END IF;
 IF NOT has_function_privilege('authenticated',v_fn,'EXECUTE') THEN
   RAISE EXCEPTION 'FAIL: authenticated callers lack gated review RPC EXECUTE';
 END IF;

 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=v_audit_table AND relrowsecurity)
 THEN
   RAISE EXCEPTION 'FAIL: audit event RLS disabled';
 END IF;
 IF has_table_privilege('anon',v_audit_table,'SELECT') OR
    has_table_privilege('anon',v_audit_table,'INSERT') OR
    has_table_privilege('anon',v_audit_table,'UPDATE') OR
    has_table_privilege('anon',v_audit_table,'DELETE') THEN
   RAISE EXCEPTION 'FAIL: anonymous role has audit table privileges';
 END IF;
 IF has_table_privilege('authenticated',v_audit_table,'INSERT') OR
    has_table_privilege('authenticated',v_audit_table,'UPDATE') OR
    has_table_privilege('authenticated',v_audit_table,'DELETE') THEN
   RAISE EXCEPTION 'FAIL: client can write or erase audit events';
 END IF;

 SELECT count(*) INTO v_policy_count FROM pg_policies WHERE
   schemaname='public' AND tablename='university_review_events'
   AND cmd='SELECT' AND 'authenticated'=ANY(roles)
   AND qual LIKE '%has_role%';
 IF v_policy_count<>1 THEN RAISE EXCEPTION
   'FAIL: audit policy must restrict authenticated SELECT to Admin'; END IF;

 SELECT count(*) INTO v_trigger_count FROM pg_trigger tg
 JOIN pg_class c ON c.oid=tg.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND tg.tgname IN
   ('a16_university_insert_check','a16_evidence_insert_check',
    'a16_classification_insert_check','a16_institution_no_edit_after_review')
    AND NOT tg.tgisinternal AND tg.tgenabled='O';
 IF v_trigger_count<>4 THEN
   RAISE EXCEPTION 'FAIL: expected exactly four enabled guard triggers';
 END IF;

 IF EXISTS (
   SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('ick_a16_enforce_unreviewed_registry_insert',
                        'ick_a16_block_edits_after_source_review')
      AND p.prosecdef
 ) THEN
   RAISE EXCEPTION 'FAIL: ordinary guard trigger function has definer privilege';
 END IF;
END $rpc_security$;
SELECT 'A16_ISOLATED_RPC_PRIVILEGE_CATALOG_AUDIT_PASS' AS result;
