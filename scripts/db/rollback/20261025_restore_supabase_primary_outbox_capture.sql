-- ROLLBACK ONLY, explicit authorization required. Original function before no-replication policy.
BEGIN;
CREATE OR REPLACE FUNCTION public.sfi_capture_primary_data_plane_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  insert into public.sfi_data_plane_primary_outbox (
    source_txid, table_name, operation, row_data, before_data
  ) values (
    txid_current(),
    tg_table_name,
    case when tg_op = 'DELETE' then 'DELETE' else 'UPSERT' end,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );
  return coalesce(new, old);
end;
$function$
;
COMMIT;
