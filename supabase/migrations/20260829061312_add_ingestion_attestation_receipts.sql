create table if not exists public.sfi_ingestion_attestation_receipts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sfi_cases(id) on delete cascade,
  tenant_id uuid not null references public.sfi_tenants(id) on delete cascade,
  user_id uuid not null,
  storage_path text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  result_hash text not null check (result_hash ~ '^[a-f0-9]{64}$'),
  attestation_version text not null default 'SFI-INGESTION-ATTESTATION-2.0',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_sfi_ingestion_attestation_receipts_lookup
  on public.sfi_ingestion_attestation_receipts(case_id, user_id, result_hash, created_at desc);

alter table public.sfi_ingestion_attestation_receipts enable row level security;

revoke all on table public.sfi_ingestion_attestation_receipts from anon, authenticated;
grant select, insert, update, delete on table public.sfi_ingestion_attestation_receipts to service_role;

comment on table public.sfi_ingestion_attestation_receipts is
  'Short-lived, single-use control-plane receipts proving an authorized Supabase ingestion worker emitted a structured result bound to a material object. Receipt != evidence.';
