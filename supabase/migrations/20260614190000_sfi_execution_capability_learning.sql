create extension if not exists "pgcrypto";

create table if not exists public.sfi_field_perturbations (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  source_observation_id text,
  source_vector_id text,
  proposal_id text,
  perturbation_type text not null default 'campaign',
  target_domain text,
  target_audience text,
  minimal_action text not null,
  expected_effect text,
  risk_level text not null default 'medium',
  status text not null default 'candidate',
  source_pipeline jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_capability_checks (
  id uuid primary key default gen_random_uuid(),
  perturbation_id uuid references public.sfi_field_perturbations(id) on delete cascade,
  case_id text,
  capabilities_required jsonb not null default '[]'::jsonb,
  capabilities_available jsonb not null default '[]'::jsonb,
  capabilities_missing jsonb not null default '[]'::jsonb,
  capability_gap numeric not null default 0,
  executable boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_execution_ledger (
  id uuid primary key default gen_random_uuid(),
  perturbation_id uuid references public.sfi_field_perturbations(id) on delete set null,
  case_id text not null,
  actor text not null default 'system',
  artifact_type text not null,
  artifact_url text,
  artifact_hash text,
  execution_status text not null default 'generated',
  verification_status text not null default 'unverified',
  executed_at timestamptz,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_outcomes (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid references public.sfi_execution_ledger(id) on delete cascade,
  case_id text,
  outcome_status text not null default 'pending',
  observed_effect jsonb not null default '{}'::jsonb,
  unexpected_effects jsonb not null default '[]'::jsonb,
  prediction_accuracy numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_lessons (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid references public.sfi_outcomes(id) on delete cascade,
  case_id text,
  lesson text not null,
  updates_direction_engine boolean not null default false,
  updates_risk_engine boolean not null default false,
  updates_capability_engine boolean not null default false,
  atlas_update boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_media_assets (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  provider_used text not null,
  fallback_used boolean not null default false,
  asset_type text not null,
  file_url text not null,
  file_path text,
  prompt text,
  source_pipeline jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sfi_field_perturbations_case_id on public.sfi_field_perturbations(case_id);
create index if not exists idx_sfi_capability_checks_case_id on public.sfi_capability_checks(case_id);
create index if not exists idx_sfi_execution_ledger_case_id on public.sfi_execution_ledger(case_id);
create index if not exists idx_sfi_outcomes_case_id on public.sfi_outcomes(case_id);
create index if not exists idx_sfi_lessons_case_id on public.sfi_lessons(case_id);
create index if not exists idx_sfi_media_assets_case_id on public.sfi_media_assets(case_id);
