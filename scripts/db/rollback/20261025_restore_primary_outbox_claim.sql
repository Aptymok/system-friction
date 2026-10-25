-- ROLLBACK ONLY. Restoring old synchronization requires new founder authorization.
BEGIN;
CREATE OR REPLACE FUNCTION public.sfi_claim_primary_outbox_batch_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  selected_txid bigint;
  entry_count integer;
  payload jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('SFI_PRIMARY_OUTBOX_CLAIM_V1'));

  select source_txid into selected_txid
  from public.sfi_data_plane_primary_outbox
  where status = 'PENDING'
     or (status = 'CLAIMED' and claimed_at < now() - interval '5 minutes')
  order by sequence asc
  limit 1
  for update skip locked;

  if selected_txid is null then
    return jsonb_build_object('ok',true,'empty',true,'sourceTxid',null,'entries','[]'::jsonb);
  end if;

  select count(*)::int into entry_count
  from public.sfi_data_plane_primary_outbox
  where source_txid = selected_txid
    and status in ('PENDING','CLAIMED');

  if entry_count > 5000 then
    raise exception 'SFI_PRIMARY_OUTBOX_TRANSACTION_TOO_LARGE:%:%', selected_txid, entry_count;
  end if;

  update public.sfi_data_plane_primary_outbox
  set status='CLAIMED', claimed_at=now(), updated_at=now(), attempts=attempts+1
  where source_txid=selected_txid
    and status in ('PENDING','CLAIMED');

  select coalesce(jsonb_agg(jsonb_build_object(
    'operation_id',operation_id,
    'source_txid',source_txid,
    'table_name',table_name,
    'operation',operation,
    'row_data',row_data,
    'before_data',before_data
  ) order by sequence),'[]'::jsonb)
  into payload
  from public.sfi_data_plane_primary_outbox
  where source_txid=selected_txid
    and status='CLAIMED';

  return jsonb_build_object(
    'ok',true,
    'empty',false,
    'sourceTxid',selected_txid,
    'entryCount',jsonb_array_length(payload),
    'entries',payload
  );
end;
$function$
;
COMMIT;
