-- Longitudinal observations of external manifestations.
-- Platform metrics are records/observations; they do not imply cultural impact or causality.

create table if not exists public.sfi_artifact_manifestation_snapshots (
  id uuid primary key default gen_random_uuid(),
  manifestation_id uuid not null references public.sfi_artifact_manifestations(id) on delete cascade,
  owner_id uuid not null,
  tenant_id uuid null,
  observed_at timestamptz not null,
  source text not null,
  verification text not null default 'OBSERVED' check (verification in ('OBSERVED','PARTIAL','UNAVAILABLE')),
  metrics jsonb not null default '{}'::jsonb,
  content_fingerprint jsonb not null default '{}'::jsonb,
  raw_payload_persisted boolean not null default false,
  created_at timestamptz not null default now(),
  unique(manifestation_id, observed_at, source)
);

create index if not exists sfi_manifestation_snapshots_manifestation_idx on public.sfi_artifact_manifestation_snapshots(manifestation_id, observed_at);
create index if not exists sfi_manifestation_snapshots_owner_idx on public.sfi_artifact_manifestation_snapshots(owner_id, observed_at desc);

alter table public.sfi_artifact_manifestation_snapshots enable row level security;

drop policy if exists sfi_manifestation_snapshot_owner_read on public.sfi_artifact_manifestation_snapshots;
create policy sfi_manifestation_snapshot_owner_read on public.sfi_artifact_manifestation_snapshots for select to authenticated
  using (owner_id = auth.uid() or (tenant_id is not null and exists (
    select 1 from public.sfi_tenant_members m where m.tenant_id = sfi_artifact_manifestation_snapshots.tenant_id and m.user_id = auth.uid() and m.status = 'ACTIVE'
  )));

drop policy if exists sfi_manifestation_snapshot_owner_write on public.sfi_artifact_manifestation_snapshots;
create policy sfi_manifestation_snapshot_owner_write on public.sfi_artifact_manifestation_snapshots for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists sfi_manifestation_snapshot_public_read on public.sfi_artifact_manifestation_snapshots;
create policy sfi_manifestation_snapshot_public_read on public.sfi_artifact_manifestation_snapshots for select
  using (exists (
    select 1
    from public.sfi_artifact_manifestations m
    join public.sfi_artifact_identities a on a.artifact_id = m.artifact_id
    where m.id = sfi_artifact_manifestation_snapshots.manifestation_id
      and a.visibility = 'PUBLIC'
      and a.certificate_status = 'VERIFIED'
  ));
