-- C5 audit queries. Read-only. Run BEFORE and AFTER the migration and compare.

-- A. Table privileges per role (after C5: anon = SELECT on opportunities only; authenticated = FINDINGS.md section 3)
SELECT c.relname AS tbl, CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
       string_agg(a.privilege_type, ',' ORDER BY a.privilege_type) AS privs
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace,
     LATERAL aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','f')
GROUP BY 1, 2 ORDER BY 1, 2;

-- B. Column-level privileges (after C5: unchanged, discovery_settings only)
SELECT c.relname AS tbl, pg_get_userbyid(a.grantee) AS grantee, a.privilege_type AS priv,
       string_agg(att.attname, ',' ORDER BY att.attnum) AS columns
FROM pg_attribute att JOIN pg_class c ON c.oid = att.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace,
     LATERAL aclexplode(att.attacl) a
WHERE n.nspname = 'public' AND att.attacl IS NOT NULL AND NOT att.attisdropped
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- C. Default privileges (after C5: no anon/authenticated rows for postgres in public)
SELECT pg_get_userbyid(d.defaclrole) AS owner_role, d.defaclobjtype::text AS objtype,
       pg_get_userbyid(x.grantee) AS grantee, string_agg(x.privilege_type, ',') AS privs
FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace,
     LATERAL aclexplode(d.defaclacl) x
WHERE n.nspname = 'public' GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- D. cron_token (after C5: false / false)
SELECT has_column_privilege('anon', 'public.discovery_settings', 'cron_token', 'SELECT') AS anon_can_read,
       has_column_privilege('authenticated', 'public.discovery_settings', 'cron_token', 'SELECT') AS authenticated_can_read;

-- E. RLS unchanged (expect 14 tables with RLS on, 24 policies)
SELECT (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity) AS tables_with_rls,
       (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS policies;
