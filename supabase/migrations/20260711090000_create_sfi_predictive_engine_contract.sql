create extension if not exists pgcrypto;

create table if not exists public.sfi_predictive_models (
  id uuid primary key default gen_random_uuid(),
  model_key text not null unique,
  name text not null,
  version text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','retired','degraded')),
  calibration_status text not null default 'not_measured' check (calibration_status in ('not_measured','insufficient_sample','measured','degraded')),
  verified_sample_count integer not null default 0 check (verified_sample_count >= 0),
  brier_score numeric,
  bias_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_predictive_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.sfi_predictive_models(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','open','due','completed','failed','cancelled')),
  subject text not null,
  prediction numeric,
  lower_bound numeric,
  upper_bound numeric,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  due_at timestamptz,
  evidence_ids text[] not null default '{}',
  input_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lower_bound is null or upper_bound is null or lower_bound <= upper_bound)
);

create table if not exists public.sfi_predictive_evidence_requests (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sfi_predictive_runs(id) on delete cascade,
  status text not null default 'open' check (status in ('open','satisfied','waived','expired')),
  request_text text not null,
  evidence_ids text[] not null default '{}',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_predictive_outcomes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.sfi_predictive_runs(id) on delete cascade,
  observed_value numeric,
  observed_at timestamptz not null,
  residual numeric,
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_predictive_learning_events (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.sfi_predictive_models(id) on delete restrict,
  run_id uuid references public.sfi_predictive_runs(id) on delete set null,
  decision text not null,
  reason text not null,
  evidence_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists sfi_predictive_runs_due_idx on public.sfi_predictive_runs(status, due_at);
create index if not exists sfi_predictive_outcomes_observed_idx on public.sfi_predictive_outcomes(observed_at desc);

alter table public.sfi_predictive_models enable row level security;
alter table public.sfi_predictive_runs enable row level security;
alter table public.sfi_predictive_evidence_requests enable row level security;
alter table public.sfi_predictive_outcomes enable row level security;
alter table public.sfi_predictive_learning_events enable row level security;

revoke all on public.sfi_predictive_models, public.sfi_predictive_runs, public.sfi_predictive_evidence_requests, public.sfi_predictive_outcomes, public.sfi_predictive_learning_events from anon, authenticated;
grant all on public.sfi_predictive_models, public.sfi_predictive_runs, public.sfi_predictive_evidence_requests, public.sfi_predictive_outcomes, public.sfi_predictive_learning_events to service_role;
