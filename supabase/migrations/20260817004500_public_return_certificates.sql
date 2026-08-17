-- SFI Public Return Certificates V1
-- Records externally published return traces without converting publication into evidence.
-- Mutations are server-side through service_role + ROOT authorization.

create table if not exists public.public_return_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique,
  program_id text not null,
  object_id text not null,
  trace_id text not null,
  parent_trace_id text,
  platform text not null check (platform in ('instagram','tiktok','youtube','x','linkedin','medium','web','other')),
  state text not null default 'prepared' check (state in ('prepared','published','verified','invalidated')),
  epistemic_class text not null default 'RECORD',
  scheduled_at timestamptz,
  published_at timestamptz,
  observed_at timestamptz,
  external_url text,
  canonical_url text not null,
  asset_sha256 text not null,
  payload_sha256 text,
  watermark_scheme text,
  watermark_token text,
  watermark_verification jsonb not null default '{}'::jsonb,
  publication_snapshot jsonb not null default '{}'::jsonb,
  record_digest text not null,
  notes text,
  created_by uuid,
  verified_by uuid,
  invalidated_by uuid,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_return_certificates_asset_sha256_check check (asset_sha256 ~ '^[0-9a-f]{64}$'),
  constraint public_return_certificates_payload_sha256_check check (payload_sha256 is null or payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint public_return_certificates_digest_check check (record_digest ~ '^[0-9a-f]{64}$')
);

create index if not exists public_return_certificates_program_idx
  on public.public_return_certificates (program_id, created_at desc);
create index if not exists public_return_certificates_object_idx
  on public.public_return_certificates (object_id, created_at desc);
create index if not exists public_return_certificates_trace_idx
  on public.public_return_certificates (trace_id, platform);
create index if not exists public_return_certificates_state_idx
  on public.public_return_certificates (state, scheduled_at desc nulls last);

alter table public.public_return_certificates enable row level security;

drop policy if exists public_return_certificates_service_all on public.public_return_certificates;
create policy public_return_certificates_service_all on public.public_return_certificates
  for all to service_role using (true) with check (true);

comment on table public.public_return_certificates is
  'Governed registry of public return traces. A certificate records publication provenance and observation; it does not upgrade the publication to evidence by itself.';
comment on column public.public_return_certificates.record_digest is
  'SHA-256 over the canonical certificate fields for the current state; recalculated by the server service on mutation.';
comment on column public.public_return_certificates.watermark_verification is
  'Non-authoritative QA record for robust watermark/transcode tests; platform recoding survival is never guaranteed.';
