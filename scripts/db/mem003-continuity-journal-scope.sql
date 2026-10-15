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

-- Defense in depth: older live deployments can call certification(true) as
-- soon as the primary outbox is drained, before Neon -> Supabase recovery ends.
-- Enforce the actual recovery boundary inside the Neon RPC itself.
create or replace function public.sfi_set_primary_mirror_certification_v1(
  p_certified boolean,
  p_backlog integer,
  p_error text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $mem003_cert$
declare
  result jsonb;
  current_mode text;
  journal_open boolean;
  effective boolean;
begin
  select mode into current_mode
  from public.sfi_data_plane_state
  where id='institution'
  for update;
  if current_mode is null then
    raise exception 'MEM003_DATA_PLANE_STATE_MISSING';
  end if;

  select exists (
    select 1 from public.sfi_data_plane_write_journal
    where status in ('PENDING','REPLAYING','CONFLICT')
  ) into journal_open;

  -- MEM003_CERTIFICATE_ONLY_AFTER_FULL_RECOVERY
  effective := coalesce(p_certified,false)
               and current_mode='PRIMARY'
               and not journal_open;

  update public.sfi_data_plane_state
  set primary_mirror_certified=effective,
      primary_mirror_verified_at=case when effective then now() else primary_mirror_verified_at end,
      primary_mirror_backlog=greatest(coalesce(p_backlog,0),0),
      primary_mirror_last_error=case
        when coalesce(p_certified,false) and not effective then
          left(concat('MEM003_CERTIFICATION_BLOCKED:mode=',current_mode,
                      ':journalOpen=',journal_open,
                      case when p_error is not null then concat(':',p_error) else '' end),4000)
        else left(p_error,4000)
      end,
      updated_at=now()
  where id='institution'
  returning jsonb_build_object(
    'mode',mode,
    'baselineCertifiedAt',baseline_certified_at,
    'mirrorCertified',primary_mirror_certified,
    'mirrorVerifiedAt',primary_mirror_verified_at,
    'mirrorBacklog',primary_mirror_backlog,
    'mirrorError',primary_mirror_last_error
  ) into result;

  return result;
end;
$mem003_cert$;
