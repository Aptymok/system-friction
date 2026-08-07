-- SFI Cognitive Twin Core
-- No seed rows are inserted here. Empty tables are an explicit state, not missing data disguised as examples.

create extension if not exists pgcrypto;

create table if not exists public.sfi_cognitive_twin_memory (
  id uuid primary key default gen_random_uuid(),
  memory_key text not null,
  memory_type text not null check (memory_type in ('CANON','DECISION','DEFINITION','METHOD','CAPABILITY','EVIDENCE','STATE','ERROR','EXCEPTION','NARRATIVE','IP')),
  status text not null default 'CANDIDATE' check (status in ('CANDIDATE','VERIFIED','CANONICAL','REJECTED','SUPERSEDED','CONFLICTED')),
  content jsonb not null,
  evidence_refs text[] not null default '{}',
  source_kind text not null,
  source_ref text,
  version text not null default '1.0.0',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(memory_key, version)
);

create table if not exists public.sfi_cognitive_twin_decisions (
  id uuid primary key default gen_random_uuid(),
  decision_id text not null unique,
  situation text not null,
  rejected_condition text,
  correct_state text,
  general_rule text not null,
  required_evidence text[] not null default '{}',
  evidence_refs text[] not null default '{}',
  status text not null default 'CANDIDATE' check (status in ('CANDIDATE','APPROVED','REJECTED','SUPERSEDED')),
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_cognitive_twin_model_registry (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  status text not null default 'UNVERIFIED' check (status in ('UNVERIFIED','EVALUATING','APPROVED_WITH_LIMITS','APPROVED','REJECTED','DEGRADED')),
  authorized_roles text[] not null default '{}',
  prohibited_roles text[] not null default '{}',
  eval_summary jsonb not null default '{}'::jsonb,
  evidence_refs text[] not null default '{}',
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  unique(provider, model)
);

create table if not exists public.sfi_cognitive_twin_evaluations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  test_key text not null,
  test_version text not null default '1.0.0',
  outcome text not null check (outcome in ('PASS','FAIL','BLOCKED','NOT_RUN')),
  observed_result jsonb not null default '{}'::jsonb,
  evidence_refs text[] not null default '{}',
  executed_at timestamptz not null default now(),
  executor text
);

create table if not exists public.sfi_cognitive_twin_runs (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  contract_version text not null,
  provider text,
  model text,
  role text not null,
  status text not null check (status in ('REGISTERED','READY','PLANNING','POLICY_CHECK','EXECUTING','EVIDENCE_PENDING','VERIFYING','APPROVED','RELEASED','BLOCKED','REJECTED','ESCALATED','CLOSED')),
  objective text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_envelope jsonb,
  evidence_refs text[] not null default '{}',
  limitations text[] not null default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sfi_ct_memory_type_status on public.sfi_cognitive_twin_memory(memory_type, status);
create index if not exists idx_sfi_ct_decisions_status on public.sfi_cognitive_twin_decisions(status, created_at desc);
create index if not exists idx_sfi_ct_evals_model on public.sfi_cognitive_twin_evaluations(provider, model, executed_at desc);
create index if not exists idx_sfi_ct_runs_status on public.sfi_cognitive_twin_runs(status, created_at desc);

alter table public.sfi_cognitive_twin_memory enable row level security;
alter table public.sfi_cognitive_twin_decisions enable row level security;
alter table public.sfi_cognitive_twin_model_registry enable row level security;
alter table public.sfi_cognitive_twin_evaluations enable row level security;
alter table public.sfi_cognitive_twin_runs enable row level security;

-- No public policies are created. These tables are institutional ROOT infrastructure
-- and are accessed through server-side governed routes using the service role.
