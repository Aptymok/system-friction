-- SFI-AUDIO-RIGHTS-SEPARATION-1.0
-- Instrument Bank and Cultural Reference Bank are distinct durable owners.
-- Raw audio bytes are intentionally absent from both schemas.
-- AUTHENTICATION != AUTHORIZATION and ACCOUNT/ROW OWNERSHIP != RIGHTS AUTHORITY.

create table if not exists public.sfi_cultural_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  work_identifier text not null,
  source text not null,
  rights_status text not null check (rights_status in (
    'UNKNOWN',
    'OBSERVATION_ONLY',
    'EXECUTION_ALLOWED',
    'DERIVATIVE_ALLOWED',
    'PUBLICATION_ALLOWED',
    'RESTRICTED'
  )),
  rights_evidence_ref text,
  external_asset_ref text,
  reference_hash text,
  feature_manifest jsonb not null default '{}'::jsonb,
  embedding_ref text,
  fad jsonb,
  cvf jsonb,
  mihm jsonb,
  observed_cultural_vector jsonb,
  observed_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sfi_cultural_references_reference_required
    check (external_asset_ref is not null or reference_hash is not null)
);

create table if not exists public.sfi_instruments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  name text not null,
  family text not null,
  origin text,
  engine text not null,
  package_ref text,
  package_hash text,
  license text,
  rights_status text not null check (rights_status in (
    'UNKNOWN',
    'OBSERVATION_ONLY',
    'EXECUTION_ALLOWED',
    'DERIVATIVE_ALLOWED',
    'PUBLICATION_ALLOWED',
    'RESTRICTED'
  )),
  rights_evidence_ref text,
  source_reference_id uuid references public.sfi_cultural_references(id) on delete restrict,
  source_rights_at_materialization text check (source_rights_at_materialization is null or source_rights_at_materialization in (
    'UNKNOWN',
    'OBSERVATION_ONLY',
    'EXECUTION_ALLOWED',
    'DERIVATIVE_ALLOWED',
    'PUBLICATION_ALLOWED',
    'RESTRICTED'
  )),
  current_execution_rights_state text not null default 'BLOCKED_NOT_PRODUCTION' check (current_execution_rights_state in (
    'ELIGIBLE',
    'BLOCKED_SOURCE_RIGHTS',
    'BLOCKED_TARGET_RIGHTS',
    'BLOCKED_NOT_PRODUCTION',
    'BLOCKED_PACKAGE_VERIFICATION'
  )),
  rights_checked_at timestamptz not null default now(),
  range_low integer,
  range_high integer,
  articulations text[] not null default '{}'::text[],
  velocity_layers integer check (velocity_layers is null or velocity_layers >= 0),
  round_robins integer check (round_robins is null or round_robins >= 0),
  sample_rate integer check (sample_rate is null or sample_rate > 0),
  quality_state text not null default 'DRAFT' check (quality_state in (
    'DRAFT',
    'VERIFIED',
    'PRODUCTION',
    'REJECTED'
  )),
  cultural_profiles text[] not null default '{}'::text[],
  version integer not null default 1 check (version > 0),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sfi_instruments_range_order
    check (range_low is null or range_high is null or range_low <= range_high),
  constraint sfi_instruments_source_snapshot_consistency
    check (
      (source_reference_id is null and source_rights_at_materialization is null)
      or
      (source_reference_id is not null and source_rights_at_materialization is not null)
    )
);

comment on column public.sfi_instruments.current_execution_rights_state is
  'Current material-rights eligibility only. ELIGIBLE never grants institutional execution authority.';
comment on column public.sfi_instruments.source_rights_at_materialization is
  'Immutable snapshot of source rights at materialization time; current source rights are re-evaluated independently.';

create index if not exists sfi_cultural_references_owner_created_idx
  on public.sfi_cultural_references(owner_id, created_at desc);
create index if not exists sfi_instruments_owner_created_idx
  on public.sfi_instruments(owner_id, created_at desc);
create index if not exists sfi_instruments_source_reference_idx
  on public.sfi_instruments(source_reference_id);

alter table public.sfi_cultural_references enable row level security;
alter table public.sfi_cultural_references force row level security;
alter table public.sfi_instruments enable row level security;
alter table public.sfi_instruments force row level security;

-- Direct authenticated mutation is intentionally absent. Reads remain owner-scoped;
-- writes are performed only by the existing server-side governed writer and still hit DB triggers.
revoke all on public.sfi_cultural_references from anon;
revoke all on public.sfi_instruments from anon;
revoke all on public.sfi_cultural_references from authenticated;
revoke all on public.sfi_instruments from authenticated;
grant select on public.sfi_cultural_references to authenticated;
grant select on public.sfi_instruments to authenticated;

drop policy if exists sfi_cultural_references_owner_select on public.sfi_cultural_references;
drop policy if exists sfi_cultural_references_owner_insert on public.sfi_cultural_references;
drop policy if exists sfi_cultural_references_owner_update on public.sfi_cultural_references;
drop policy if exists sfi_cultural_references_owner_delete on public.sfi_cultural_references;
create policy sfi_cultural_references_owner_select on public.sfi_cultural_references
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists sfi_instruments_owner_select on public.sfi_instruments;
drop policy if exists sfi_instruments_owner_insert on public.sfi_instruments;
drop policy if exists sfi_instruments_owner_update on public.sfi_instruments;
drop policy if exists sfi_instruments_owner_delete on public.sfi_instruments;
create policy sfi_instruments_owner_select on public.sfi_instruments
for select to authenticated
using (owner_id = auth.uid());

create or replace function public.sfi_forbid_material_registry_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'SFI_AUDIO_REGISTRY_DELETE_FORBIDDEN';
end;
$$;

create or replace function public.sfi_guard_cultural_reference_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.work_identifier is distinct from old.work_identifier
     or new.source is distinct from old.source
     or new.external_asset_ref is distinct from old.external_asset_ref
     or new.reference_hash is distinct from old.reference_hash
     or new.feature_manifest is distinct from old.feature_manifest
     or new.embedding_ref is distinct from old.embedding_ref
     or new.fad is distinct from old.fad
     or new.cvf is distinct from old.cvf
     or new.mihm is distinct from old.mihm
     or new.observed_cultural_vector is distinct from old.observed_cultural_vector
     or new.observed_at is distinct from old.observed_at
     or new.created_at is distinct from old.created_at then
    raise exception 'SFI_AUDIO_REFERENCE_IDENTITY_AND_OBSERVATION_IMMUTABLE';
  end if;

  if new.version <> old.version + 1 then
    raise exception 'SFI_AUDIO_REFERENCE_RIGHTS_REVISION_VERSION_REQUIRED';
  end if;

  if new.rights_status is not distinct from old.rights_status then
    raise exception 'SFI_AUDIO_REFERENCE_RIGHTS_REVISION_REQUIRES_STATE_CHANGE';
  end if;

  if new.rights_evidence_ref is null or btrim(new.rights_evidence_ref) = '' then
    raise exception 'SFI_AUDIO_RIGHTS_REVISION_EVIDENCE_REQUIRED';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sfi_enforce_instrument_rights()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_rights text;
begin
  if tg_op = 'UPDATE' then
    if new.owner_id is distinct from old.owner_id
       or new.name is distinct from old.name
       or new.family is distinct from old.family
       or new.origin is distinct from old.origin
       or new.engine is distinct from old.engine
       or new.package_ref is distinct from old.package_ref
       or new.package_hash is distinct from old.package_hash
       or new.license is distinct from old.license
       or new.rights_status is distinct from old.rights_status
       or new.rights_evidence_ref is distinct from old.rights_evidence_ref
       or new.source_reference_id is distinct from old.source_reference_id
       or new.source_rights_at_materialization is distinct from old.source_rights_at_materialization
       or new.range_low is distinct from old.range_low
       or new.range_high is distinct from old.range_high
       or new.articulations is distinct from old.articulations
       or new.velocity_layers is distinct from old.velocity_layers
       or new.round_robins is distinct from old.round_robins
       or new.sample_rate is distinct from old.sample_rate
       or new.quality_state is distinct from old.quality_state
       or new.cultural_profiles is distinct from old.cultural_profiles
       or new.version is distinct from old.version
       or new.verified_at is distinct from old.verified_at
       or new.created_at is distinct from old.created_at then
      raise exception 'SFI_AUDIO_INSTRUMENT_IMMUTABLE_AFTER_REGISTRATION';
    end if;
  end if;

  if new.source_reference_id is not null then
    select rights_status
      into source_rights
      from public.sfi_cultural_references
     where id = new.source_reference_id
       and owner_id = new.owner_id;

    if source_rights is null then
      raise exception 'SFI_AUDIO_REFERENCE_NOT_AVAILABLE_TO_OWNER';
    end if;
  end if;

  if tg_op = 'INSERT' and new.source_reference_id is not null then
    if source_rights not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED';
    end if;

    if new.rights_status not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED';
    end if;

    new.source_rights_at_materialization := source_rights;
  elsif tg_op = 'INSERT' then
    new.source_rights_at_materialization := null;
  end if;

  if new.quality_state = 'PRODUCTION' then
    if new.rights_status not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED';
    end if;
    if new.package_ref is null or new.package_hash is null or new.verified_at is null then
      raise exception 'SFI_AUDIO_PRODUCTION_PACKAGE_VERIFICATION_REQUIRED';
    end if;
  end if;

  if new.source_reference_id is not null and source_rights not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
    new.current_execution_rights_state := 'BLOCKED_SOURCE_RIGHTS';
  elsif new.rights_status not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
    new.current_execution_rights_state := 'BLOCKED_TARGET_RIGHTS';
  elsif new.quality_state <> 'PRODUCTION' then
    new.current_execution_rights_state := 'BLOCKED_NOT_PRODUCTION';
  elsif new.package_ref is null or new.package_hash is null or new.verified_at is null then
    new.current_execution_rights_state := 'BLOCKED_PACKAGE_VERIFICATION';
  else
    new.current_execution_rights_state := 'ELIGIBLE';
  end if;

  new.rights_checked_at := now();
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.sfi_propagate_cultural_reference_rights_drift()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.rights_status is distinct from old.rights_status then
    update public.sfi_instruments
       set rights_checked_at = now()
     where source_reference_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sfi_cultural_references_update_guard on public.sfi_cultural_references;
create trigger sfi_cultural_references_update_guard
before update on public.sfi_cultural_references
for each row execute function public.sfi_guard_cultural_reference_update();

drop trigger if exists sfi_cultural_references_rights_drift on public.sfi_cultural_references;
create trigger sfi_cultural_references_rights_drift
after update of rights_status on public.sfi_cultural_references
for each row execute function public.sfi_propagate_cultural_reference_rights_drift();

drop trigger if exists sfi_cultural_references_delete_guard on public.sfi_cultural_references;
create trigger sfi_cultural_references_delete_guard
before delete on public.sfi_cultural_references
for each row execute function public.sfi_forbid_material_registry_delete();

drop trigger if exists sfi_instruments_rights_guard on public.sfi_instruments;
create trigger sfi_instruments_rights_guard
before insert or update on public.sfi_instruments
for each row execute function public.sfi_enforce_instrument_rights();

drop trigger if exists sfi_instruments_delete_guard on public.sfi_instruments;
create trigger sfi_instruments_delete_guard
before delete on public.sfi_instruments
for each row execute function public.sfi_forbid_material_registry_delete();

revoke execute on function public.sfi_forbid_material_registry_delete() from public, anon, authenticated;
revoke execute on function public.sfi_guard_cultural_reference_update() from public, anon, authenticated;
revoke execute on function public.sfi_enforce_instrument_rights() from public, anon, authenticated;
revoke execute on function public.sfi_propagate_cultural_reference_rights_drift() from public, anon, authenticated;
