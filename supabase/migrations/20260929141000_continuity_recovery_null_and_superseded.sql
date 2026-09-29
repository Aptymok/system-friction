-- SFI continuity recovery hardening after observed 2026-09-29 replay.
-- 1) JSON null must become SQL NULL before jsonb_populate_record.
-- 2) Post-failover PRIMARY writes may be retained as explicitly superseded rather than falsely MIRRORED.

do $patch$
declare f text;
begin
  select pg_get_functiondef('public.sfi_apply_continuity_batch_v1(uuid,bigint,jsonb)'::regprocedure) into f;
  f := replace(f,
    'before_data := entry->''before_data'';',
    'before_data := nullif(entry->''before_data'', ''null''::jsonb);'
  );
  if f not like '%nullif(entry->''before_data'', ''null''::jsonb)%' then
    raise exception 'SFI_CONTINUITY_NULL_NORMALIZATION_PATCH_NOT_APPLIED';
  end if;
  execute f;
end
$patch$;

alter table public.sfi_data_plane_primary_outbox
  drop constraint if exists sfi_data_plane_primary_outbox_status_check;
alter table public.sfi_data_plane_primary_outbox
  add constraint sfi_data_plane_primary_outbox_status_check
  check (status = any(array['PENDING','CLAIMED','MIRRORED','CONFLICT','SUPERSEDED_BY_CONTINUITY']::text[]));
