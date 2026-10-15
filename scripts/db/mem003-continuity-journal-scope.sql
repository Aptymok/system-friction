-- MEM-003 / phase 1: stop treating plane-local governance and health state
-- as business-data replay. Preserves source images and classification evidence.
-- Tested and deployed only through the existing governed migration path.
create or replace function public.sfi_capture_data_plane_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $sfi_mem003$
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
$sfi_mem003$;


-- Existing operations retain their payload, original before image, ID, epoch and
-- source transaction. LOCAL_ONLY means intentionally NOT applied to Supabase.
-- The conflict is real but out of scope of bilateral business-data replay.
alter table public.sfi_data_plane_write_journal
  drop constraint sfi_data_plane_write_journal_status_check,
  add constraint sfi_data_plane_write_journal_status_check
  check (status in ('PENDING','REPLAYING','REPLAYED','CONFLICT','LOCAL_ONLY'));

-- A bounded update of the exact same plane-local table set as the trigger guard
-- above. Existing REPLAYED receipts remain REPLAYED; no journal rows are deleted.
update public.sfi_data_plane_write_journal j
   set status='LOCAL_ONLY',
       last_error=left(
         concat_ws(' | ',nullif(j.last_error,''),
           'MEM003_LOCAL_CONTROL_PLANE_EXCLUDED_FROM_BILATERAL_REPLAY'),4000),
       updated_at=now()
 where j.status in ('PENDING','CONFLICT')
   and j.table_name in (
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
   );
-- No PRIMARY promotion or outbox acknowledgement occurs here.
