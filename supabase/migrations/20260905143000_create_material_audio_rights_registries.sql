-- SFI-AUDIO-RIGHTS-SEPARATION-1.0
-- Instrument Bank and Cultural Reference Bank are distinct durable owners.
-- Raw audio bytes are intentionally absent from both schemas.

create table if not exists public.sfi_cultural_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
  source_reference_id uuid references public.sfi_cultural_references(id) on delete set null,
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
    check (range_low is null or range_high is null or range_low <= range_high)
);

create index if not exists sfi_cultural_references_owner_created_idx
  on public.sfi_cultural_references(owner_id, created_at desc);
create index if not exists sfi_instruments_owner_created_idx
  on public.sfi_instruments(owner_id, created_at desc);
create index if not exists sfi_instruments_source_reference_idx
  on public.sfi_instruments(source_reference_id);

alter table public.sfi_cultural_references enable row level security;
alter table public.sfi_instruments enable row level security;

revoke all on public.sfi_cultural_references from anon;
revoke all on public.sfi_instruments from anon;
grant select, insert, update, delete on public.sfi_cultural_references to authenticated;
grant select, insert, update, delete on public.sfi_instruments to authenticated;

drop policy if exists sfi_cultural_references_owner_select on public.sfi_cultural_references;
create policy sfi_cultural_references_owner_select on public.sfi_cultural_references
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists sfi_cultural_references_owner_insert on public.sfi_cultural_references;
create policy sfi_cultural_references_owner_insert on public.sfi_cultural_references
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists sfi_cultural_references_owner_update on public.sfi_cultural_references;
create policy sfi_cultural_references_owner_update on public.sfi_cultural_references
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists sfi_cultural_references_owner_delete on public.sfi_cultural_references;
create policy sfi_cultural_references_owner_delete on public.sfi_cultural_references
for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists sfi_instruments_owner_select on public.sfi_instruments;
create policy sfi_instruments_owner_select on public.sfi_instruments
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists sfi_instruments_owner_insert on public.sfi_instruments;
create policy sfi_instruments_owner_insert on public.sfi_instruments
for insert to authenticated
with check (owner_id = auth.uid());

drop policy if exists sfi_instruments_owner_update on public.sfi_instruments;
create policy sfi_instruments_owner_update on public.sfi_instruments
for update to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists sfi_instruments_owner_delete on public.sfi_instruments;
create policy sfi_instruments_owner_delete on public.sfi_instruments
for delete to authenticated
using (owner_id = auth.uid());

create or replace function public.sfi_enforce_instrument_rights()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_rights text;
begin
  if new.quality_state = 'PRODUCTION' then
    if new.rights_status not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED';
    end if;
    if new.package_ref is null or new.package_hash is null or new.verified_at is null then
      raise exception 'SFI_AUDIO_PRODUCTION_PACKAGE_VERIFICATION_REQUIRED';
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

    if source_rights not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED';
    end if;

    if new.rights_status not in ('EXECUTION_ALLOWED', 'DERIVATIVE_ALLOWED') then
      raise exception 'SFI_AUDIO_INSTRUMENT_EXECUTION_RIGHTS_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sfi_instruments_rights_guard on public.sfi_instruments;
create trigger sfi_instruments_rights_guard
before insert or update of owner_id, source_reference_id, rights_status, quality_state, package_ref, package_hash, verified_at
on public.sfi_instruments
for each row execute function public.sfi_enforce_instrument_rights();
