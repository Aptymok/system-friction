-- SFI Artifact Identity + External Manifestations V1
-- Stable institutional identity is separate from byte hashes and platform identities.

create table if not exists public.sfi_artifact_identities (
  id uuid primary key default gen_random_uuid(),
  artifact_id text not null unique,
  owner_id uuid not null,
  tenant_id uuid null,
  source_object_id text null,
  attractor_key text null,
  project_key text null,
  node_key text null,
  object_label text not null,
  version text not null default '1',
  media_type text not null default 'unknown',
  exact_hash_algorithm text null,
  exact_hash_value text null,
  perceptual_algorithm text null,
  perceptual_value text null,
  lineage_root_hash text null,
  analysis_snapshot_hash text null,
  mihm_snapshot_hash text null,
  visibility text not null default 'PRIVATE' check (visibility in ('PRIVATE','PUBLIC')),
  certificate_status text not null default 'DRAFT' check (certificate_status in ('DRAFT','VERIFIED','SUPERSEDED','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((exact_hash_algorithm is null and exact_hash_value is null) or (exact_hash_algorithm is not null and exact_hash_value is not null)),
  check ((perceptual_algorithm is null and perceptual_value is null) or (perceptual_algorithm is not null and perceptual_value is not null))
);

create index if not exists sfi_artifact_identities_owner_idx on public.sfi_artifact_identities(owner_id, created_at desc);
create index if not exists sfi_artifact_identities_project_idx on public.sfi_artifact_identities(project_key, node_key, created_at desc);
create index if not exists sfi_artifact_identities_source_object_idx on public.sfi_artifact_identities(source_object_id) where source_object_id is not null;

create table if not exists public.sfi_artifact_manifestations (
  id uuid primary key default gen_random_uuid(),
  artifact_id text null references public.sfi_artifact_identities(artifact_id) on update cascade on delete set null,
  owner_id uuid not null,
  tenant_id uuid null,
  scope_type text not null check (scope_type in ('ATTRACTOR','PROJECT','NODE','OBJECT','ARTIFACT')),
  scope_key text not null,
  platform text not null,
  external_url text not null,
  platform_object_id text null,
  relation_type text not null check (relation_type in ('PUBLISHED_AS','ROUTED_BY','SOURCE_REPOSITORY','PUBLIC_SYSTEM_SURFACE','EXTERNAL_CHANNEL','ATLAS_COLLECTION','DERIVATIVE')),
  verification text not null default 'DECLARED' check (verification in ('DECLARED','VERIFIED','UNAVAILABLE','MISMATCH')),
  observed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, external_url)
);

create index if not exists sfi_artifact_manifestations_artifact_idx on public.sfi_artifact_manifestations(artifact_id, created_at desc);
create index if not exists sfi_artifact_manifestations_scope_idx on public.sfi_artifact_manifestations(scope_type, scope_key, created_at desc);
create index if not exists sfi_artifact_manifestations_platform_idx on public.sfi_artifact_manifestations(platform, platform_object_id) where platform_object_id is not null;

alter table public.sfi_artifact_identities enable row level security;
alter table public.sfi_artifact_manifestations enable row level security;

drop policy if exists sfi_artifact_public_read on public.sfi_artifact_identities;
create policy sfi_artifact_public_read on public.sfi_artifact_identities for select
  using (visibility = 'PUBLIC' and certificate_status = 'VERIFIED');

drop policy if exists sfi_artifact_owner_read on public.sfi_artifact_identities;
create policy sfi_artifact_owner_read on public.sfi_artifact_identities for select to authenticated
  using (owner_id = auth.uid() or (tenant_id is not null and exists (
    select 1 from public.sfi_tenant_members m where m.tenant_id = sfi_artifact_identities.tenant_id and m.user_id = auth.uid() and m.status = 'ACTIVE'
  )));

drop policy if exists sfi_artifact_owner_write on public.sfi_artifact_identities;
create policy sfi_artifact_owner_write on public.sfi_artifact_identities for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists sfi_manifestation_public_read on public.sfi_artifact_manifestations;
create policy sfi_manifestation_public_read on public.sfi_artifact_manifestations for select
  using (artifact_id is not null and exists (
    select 1 from public.sfi_artifact_identities a where a.artifact_id = sfi_artifact_manifestations.artifact_id and a.visibility = 'PUBLIC' and a.certificate_status = 'VERIFIED'
  ));

drop policy if exists sfi_manifestation_owner_read on public.sfi_artifact_manifestations;
create policy sfi_manifestation_owner_read on public.sfi_artifact_manifestations for select to authenticated
  using (owner_id = auth.uid() or (tenant_id is not null and exists (
    select 1 from public.sfi_tenant_members m where m.tenant_id = sfi_artifact_manifestations.tenant_id and m.user_id = auth.uid() and m.status = 'ACTIVE'
  )));

drop policy if exists sfi_manifestation_owner_write on public.sfi_artifact_manifestations;
create policy sfi_manifestation_owner_write on public.sfi_artifact_manifestations for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
