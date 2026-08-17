-- SFI Return Certificates
-- A return certificate records an external publication manifestation and its
-- persistent artifact lineage. It does not upgrade a social publication into
-- phenomenon evidence, causal proof, validation or truth.

create table if not exists public.sfi_return_certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_code text not null unique,
  parent_trace_id text not null,
  artifact_id text,
  node text not null,
  object_label text not null,
  platform text not null check (platform in ('instagram','tiktok','youtube','x','medium','web','other')),
  publication_url text not null,
  publication_url_sha256 text not null check (publication_url_sha256 ~ '^[0-9a-f]{64}$'),
  published_at timestamptz not null,
  asset_sha256 text not null check (asset_sha256 ~ '^[0-9a-f]{64}$'),
  payload_sha256 text check (payload_sha256 is null or payload_sha256 ~ '^[0-9a-f]{64}$'),
  watermark_code24 text check (watermark_code24 is null or watermark_code24 ~ '^[0-9a-f]{6}$'),
  watermark_method text,
  watermark_qa jsonb not null default '{}'::jsonb,
  verification_state text not null default 'URL_RECORDED' check (verification_state in (
    'URL_RECORDED','WATERMARK_VERIFIED','REVOKED'
  )),
  epistemic_class text not null default 'RECORD' check (epistemic_class = 'RECORD'),
  certificate_hash text not null unique check (certificate_hash ~ '^[0-9a-f]{64}$'),
  verification_statement text not null default 'External publication URL and artifact lineage recorded. Publication ≠ evidence; verification ≠ causal proof.',
  metadata jsonb not null default '{}'::jsonb,
  issued_by uuid,
  issued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_return_certificates_node_idx
  on public.sfi_return_certificates (node, published_at desc);
create index if not exists sfi_return_certificates_object_idx
  on public.sfi_return_certificates (object_label, published_at desc);
create index if not exists sfi_return_certificates_platform_idx
  on public.sfi_return_certificates (platform, published_at desc);

alter table public.sfi_return_certificates enable row level security;

drop policy if exists sfi_return_certificates_service_all on public.sfi_return_certificates;
create policy sfi_return_certificates_service_all on public.sfi_return_certificates
  for all to service_role using (true) with check (true);

comment on table public.sfi_return_certificates is
  'Governed external-return registry. A certificate proves SFI recorded a URL/artifact lineage; it does not make the publication evidence or establish causality.';
