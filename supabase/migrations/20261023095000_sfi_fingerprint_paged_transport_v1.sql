-- MEM-003 P0: transport-only paging of the exact semantic fingerprint v2.
-- Existing sfi_data_plane_fingerprint_v2 remains unchanged for audit.
-- Apply identically to BOTH Supabase and Neon before deploying the caller.
-- Every public base table in the v2 inclusion set must still be checked:
-- paging lowers per-request scan size, never widens equality or ignores data.
CREATE OR REPLACE FUNCTION public.sfi_data_plane_fingerprint_page_v1(
  p_after_table text DEFAULT '',
  p_limit integer DEFAULT 8
)
RETURNS TABLE(table_name text, row_count text, hash_a text, hash_b text)
LANGUAGE plpgsql
SECURITY DEFINER
-- Explicitly put pg_temp LAST; otherwise PostgreSQL may implicitly search
-- the caller's temporary schema first for relation/type names in a definer.
SET search_path = pg_catalog, public, pg_temp
AS $sfi_fingerprint_page$
DECLARE
  r record;
  c bigint;
  a numeric;
  b numeric;
  expr text;
  where_clause text;
BEGIN
  IF p_after_table IS NULL OR length(p_after_table) > 63 OR
     p_limit IS NULL OR p_limit < 1 OR p_limit > 8 THEN
    RAISE EXCEPTION 'SFI_FINGERPRINT_PAGE_INVALID_BOUNDS';
  END IF;
  FOR r IN
    SELECT cls.relname
    FROM pg_class cls JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public' AND cls.relkind = 'r'
      AND (cls.relname::text COLLATE "C") > (p_after_table COLLATE "C")
      AND cls.relname NOT IN (
        'sfi_continuity_state','sfi_continuity_runs','sfi_capability_health_checks',
        'sfi_institutional_incidents','sfi_founder_decision_queue','sfi_continuity_reports',
        'sfi_data_plane_state','sfi_data_plane_write_journal',
        'sfi_continuity_applied_operations','sfi_data_plane_primary_outbox',
        'sfi_primary_mirror_applied_operations'
      )
    ORDER BY cls.relname::text COLLATE "C"
    LIMIT p_limit
  LOOP
    expr := 'to_jsonb(t)::text';
    where_clause := '';
    IF r.relname = 'platform_metric_snapshots' THEN
      expr := $canonical$(
         jsonb_set(
           jsonb_set(to_jsonb(t),'{reliability}',
             coalesce(to_jsonb(trim_scale(t.reliability)),'null'::jsonb),true),
           '{metric_value}',
           coalesce(to_jsonb(trim_scale(t.metric_value)),'null'::jsonb),true
         )::text
      )$canonical$;
    ELSIF r.relname = 'sfi_oauth_authorization_codes' THEN
      where_clause := ' where t.expires_at > now()';
    END IF;
    EXECUTE format(
      'select count(*)::bigint,
        coalesce(sum(((''x''||substr(md5(%1$s),1,16))::bit(64)::bigint)::numeric),0),
        coalesce(sum(((''x''||substr(md5(%1$s),17,16))::bit(64)::bigint)::numeric),0)
       from public.%2$I t%3$s', expr, r.relname, where_clause
    ) INTO c, a, b;
    table_name := r.relname;
    -- Text transport is exact: PostgREST JSON numeric and JS Number lose
    -- precision for institutional sums larger than 2^53.
    row_count := c::text;
    hash_a := a::text;
    hash_b := b::text;
    RETURN NEXT;
  END LOOP;
END;
$sfi_fingerprint_page$;

-- New SECURITY DEFINER reader: no public, anonymous or user execution.
REVOKE ALL ON FUNCTION public.sfi_data_plane_fingerprint_page_v1(text,integer) FROM PUBLIC;
DO $sfi_fingerprint_roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.sfi_data_plane_fingerprint_page_v1(text,integer) TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sfi_continuity_service') THEN
    GRANT EXECUTE ON FUNCTION public.sfi_data_plane_fingerprint_page_v1(text,integer) TO sfi_continuity_service;
  END IF;
END;
$sfi_fingerprint_roles$;
