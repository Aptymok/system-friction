-- SFI executable inference trace + artifact trajectory
-- These are typed records inside an existing SFI operating cycle, not new standalone products.

create extension if not exists pgcrypto;

create table if not exists public.sfi_inference_traces (
  id uuid primary key default gen_random_uuid(),
  operating_cycle_id uuid not null references public.sfi_operating_cycles(id) on delete cascade,
  owner_id uuid not null,
  question text not null,
  primary_hypothesis text not null,
  rival_hypotheses text[] not null default '{}',
  evidence_refs text[] not null default '{}',
  unknowns text[] not null default '{}',
  discriminating_observations text[] not null default '{}',
  stopping_condition text,
  epistemic_class text not null default 'INFERRED' check (epistemic_class in ('INFERRED','PROPOSED')),
  status text not null default 'OPEN' check (status in ('OPEN','CONTRAST_READY','CONTRASTED','REJECTED','ARCHIVED')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sfi_inference_traces_cycle on public.sfi_inference_traces(operating_cycle_id, created_at desc);
create index if not exists idx_sfi_inference_traces_owner on public.sfi_inference_traces(owner_id, created_at desc);
alter table public.sfi_inference_traces enable row level security;

comment on table public.sfi_inference_traces is
  'Executable SFI inference trace: separates a primary hypothesis, rivals, unknowns and discriminating observations. An inference trace is not observed evidence and cannot promote itself.';

create table if not exists public.sfi_artifact_trajectory_events (
  id uuid primary key default gen_random_uuid(),
  operating_cycle_id uuid not null references public.sfi_operating_cycles(id) on delete cascade,
  owner_id uuid not null,
  object_ref text not null,
  parent_event_id uuid references public.sfi_artifact_trajectory_events(id) on delete set null,
  platform text,
  source_uri text,
  observed_at timestamptz not null,
  relation text not null default 'OBSERVED_STATE' check (relation in ('ORIGIN','OBSERVED_STATE','COPY','REMIX','MUTATION','PUBLICATION','RECOVERY','RETURN')),
  content_hash text,
  marker_ref text,
  evidence_refs text[] not null default '{}',
  semantic_state jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_sfi_artifact_trajectory_cycle on public.sfi_artifact_trajectory_events(operating_cycle_id, observed_at, created_at);
create index if not exists idx_sfi_artifact_trajectory_object on public.sfi_artifact_trajectory_events(object_ref, observed_at, created_at);
alter table public.sfi_artifact_trajectory_events enable row level security;

comment on table public.sfi_artifact_trajectory_events is
  'Observed or declared artifact trajectory event linked to an SFI operating cycle. Storage of a relation does not prove causality, semantic drift or propagation without supporting evidence.';

alter table if exists public.sfi_operating_cycles
  add column if not exists inference_refs text[] not null default '{}',
  add column if not exists trajectory_refs text[] not null default '{}';
