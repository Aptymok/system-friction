-- SFI-CONTINUITY-STATE-SINGLETON-RESEED-1.0
-- A canonical reset may clear operational history, but it must not leave the
-- institutional continuity control plane without its required singleton.
-- This trigger reconstructs only the schema-owned default state after TRUNCATE;
-- it does not preserve pre-reset runtime mode/history.

create or replace function public.sfi_reseed_continuity_state_after_truncate()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.sfi_continuity_state (
    id,
    mode,
    founder_available,
    metadata,
    updated_at
  ) values (
    'institution',
    'NORMAL',
    true,
    jsonb_build_object(
      'genesis', true,
      'reseededBy', 'SFI_CONTINUITY_STATE_TRUNCATE_TRIGGER',
      'contract', 'SFI-CONTINUITY-STATE-SINGLETON-RESEED-1.0'
    ),
    now()
  )
  on conflict (id) do nothing;

  return null;
end;
$$;

drop trigger if exists sfi_continuity_state_reseed_after_truncate on public.sfi_continuity_state;
create trigger sfi_continuity_state_reseed_after_truncate
after truncate on public.sfi_continuity_state
for each statement
execute function public.sfi_reseed_continuity_state_after_truncate();

-- Repair already-empty environments idempotently without rewriting a real state.
insert into public.sfi_continuity_state (
  id,
  mode,
  founder_available,
  metadata
) values (
  'institution',
  'NORMAL',
  true,
  jsonb_build_object(
    'genesis', true,
    'reseededBy', 'SFI_CONTINUITY_STATE_SINGLETON_MIGRATION',
    'contract', 'SFI-CONTINUITY-STATE-SINGLETON-RESEED-1.0'
  )
)
on conflict (id) do nothing;

comment on function public.sfi_reseed_continuity_state_after_truncate() is
  'Recreates the required institution continuity singleton after bounded operational resets. It restores defaults only; it does not preserve pre-reset operational history.';
