-- SFI Operating Cycle
-- One cross-organ identity for an actual SFI execution. This is orchestration state,
-- not a new method and not evidence by itself.

create extension if not exists pgcrypto;

create table if not exists public.sfi_operating_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_code text not null unique,
  owner_id uuid not null,
  title text not null,
  question text not null,
  subject text not null,
  temporal_scope text not null,
  status text not null default 'OPEN' check (status in (
    'OPEN','EVIDENCE','METHOD_SELECTED','STUDIO','METHOD_LAB','FIELD','WAITING_RETURN',
    'RETURNED','CONTRASTED','TWIN_SYNCED','GOVERNANCE','CLOSED','BLOCKED','ARCHIVED'
  )),
  method_resolution jsonb not null default '{}'::jsonb,
  evidence_refs text[] not null default '{}',
  studio_object_refs text[] not null default '{}',
  method_lab_refs text[] not null default '{}',
  field_case_ref text,
  return_refs text[] not null default '{}',
  cognitive_twin_refs text[] not null default '{}',
  governance_refs text[] not null default '{}',
  event_refs text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists idx_sfi_operating_cycles_owner_updated
  on public.sfi_operating_cycles(owner_id, updated_at desc);
create index if not exists idx_sfi_operating_cycles_status
  on public.sfi_operating_cycles(status, updated_at desc);

alter table public.sfi_operating_cycles enable row level security;

comment on table public.sfi_operating_cycles is
  'Persistent orchestration identity spanning Evidence, MIHM/method selection, Studio, Method Lab, Field, Return, Cognitive Twin and ROOT governance. A row is workflow state, never evidence or scientific validation by itself.';
