-- RECOVERY ONLY - never apply automatically.\n-- Original NEON cross-provider capture prior to SFI-DB-NO-REPLICATION-2026-10-25.\n-- Requires separate explicit authorization to reintroduce replication.\nBEGIN;\nCREATE OR REPLACE FUNCTION public.sfi_capture_data_plane_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  current_mode text;
  current_epoch uuid;
  payload jsonb;
begin
  -- These local tables are excluded by the existing mirror/fingerprint contract.
  -- Their state must not be inserted into the other plane through the user data journal.
  if tg_table_name = any(array[
    'sfi_continuity_state',
    'sfi_continuity_runs',
    'sfi_capability_health_checks',
    'sfi_institutional_incidents',
    'sfi_founder_decision_queue',
    'sfi_continuity_reports',
    'sfi_data_plane_state',
    'sfi_data_plane_write_journal',
    'sfi_continuity_applied_operations',
    'sfi_data_plane_primary_outbox',
    'sfi_primary_mirror_applied_operations'
  ]::text[]) then
    return coalesce(new,old);
  end if;

  select mode, epoch into current_mode, current_epoch
  from public.sfi_data_plane_state where id='institution';

  if current_mode not in ('CONTINUITY','RECOVERY') then
    return coalesce(new,old);
  end if;

  payload := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.sfi_data_plane_write_journal
    (epoch,source_txid,table_name,operation,row_data,before_data)
  values (current_epoch,txid_current(),tg_table_name,
    case when tg_op='DELETE' then 'DELETE' else 'UPSERT' end,
    payload,case when tg_op='INSERT' then null else to_jsonb(old) end);
  return coalesce(new,old);
end;
$function$
;\nCOMMIT;\n