-- SFI Cognitive Relational Laboratory v1
-- Experimental infrastructure for observing human-model-system coupling.
-- No seed rows. No laboratory output is canonical by default.

create extension if not exists pgcrypto;

create table if not exists public.sfi_cognitive_lab_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key text not null unique,
  title text not null,
  objective text not null,
  condition text not null check (condition in (
    'FOUNDER_SOLO',
    'FOUNDER_MODEL',
    'FOUNDER_TWIN',
    'FOUNDER_HUMAN_TECH',
    'TWIN_ONLY',
    'OTHER'
  )),
  status text not null default 'OPEN' check (status in (
    'OPEN',
    'READY_FOR_BLIND',
    'BLIND_COMPLETE',
    'CONTRAST_PENDING',
    'CLOSED',
    'REJECTED'
  )),
  subject_actor text not null default 'FOUNDER',
  technology_nodes jsonb not null default '[]'::jsonb,
  human_nodes jsonb not null default '[]'::jsonb,
  baseline_session_id uuid references public.sfi_cognitive_lab_sessions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_cognitive_lab_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sfi_cognitive_lab_sessions(id) on delete cascade,
  event_kind text not null check (event_kind in (
    'PROMPT',
    'MODEL_OUTPUT',
    'FOUNDER_DECISION',
    'TOOL_EXECUTION',
    'ARTIFACT',
    'OUTCOME',
    'OBSERVATION',
    'FRICTION',
    'OMISSION',
    'OTHER'
  )),
  provenance text not null check (provenance in (
    'FOUNDER_ORIGINATED',
    'MODEL_PROPOSED',
    'CO_DEVELOPED',
    'SYSTEM_EMERGENT',
    'EXTERNAL',
    'FOUNDER_AUTHORIZATION',
    'UNKNOWN'
  )),
  actor_key text not null,
  relation_from text,
  relation_to text,
  payload jsonb not null default '{}'::jsonb,
  evidence_refs text[] not null default '{}',
  source_ref text,
  occurred_at timestamptz not null default now(),
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_cognitive_lab_analyses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sfi_cognitive_lab_sessions(id) on delete cascade,
  analysis_kind text not null check (analysis_kind in (
    'BLIND_TWIN',
    'FOUNDER_READING',
    'DIVERGENCE',
    'PPOI',
    'NEGATIVE_MAP'
  )),
  status text not null default 'CANDIDATE' check (status in (
    'CANDIDATE',
    'VERIFIED',
    'REJECTED',
    'BLOCKED'
  )),
  input_event_ids uuid[] not null default '{}',
  output jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  evidence_refs text[] not null default '{}',
  limitations text[] not null default '{}',
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_sfi_cognitive_lab_sessions_status
  on public.sfi_cognitive_lab_sessions(status, created_at desc);
create index if not exists idx_sfi_cognitive_lab_events_session_time
  on public.sfi_cognitive_lab_events(session_id, occurred_at asc, created_at asc);
create index if not exists idx_sfi_cognitive_lab_events_provenance
  on public.sfi_cognitive_lab_events(provenance, created_at desc);
create index if not exists idx_sfi_cognitive_lab_analyses_session_kind
  on public.sfi_cognitive_lab_analyses(session_id, analysis_kind, created_at desc);

alter table public.sfi_cognitive_lab_sessions enable row level security;
alter table public.sfi_cognitive_lab_events enable row level security;
alter table public.sfi_cognitive_lab_analyses enable row level security;

-- ROOT-only infrastructure. Access occurs through governed server routes using service role.
-- Explicitly no public RLS policies are created.