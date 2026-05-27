create table if not exists public.action_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_type text not null,
  title text null,
  objective text null,
  objective_hash text null,
  seed text null,
  worldspect_snapshot_id uuid null references public.worldspect_snapshots(id),
  graph_node_count integer not null default 0 check (graph_node_count >= 0),
  graph_edge_count integer not null default 0 check (graph_edge_count >= 0),
  input_vector_hash text null,
  spec_hash text null,
  content_hash text null,
  prompt_hash text null,
  status text not null default 'queued',
  requires_approval boolean not null default true,
  actor_id uuid null,
  event_id uuid null references public.epistemic_events(id),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists action_proposals_type_status_idx
on public.action_proposals (proposal_type, status, created_at desc);

create table if not exists public.logbook_mutations (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid null references public.action_proposals(id),
  event_id uuid null references public.epistemic_events(id),
  actor_id uuid null,
  mutation_type text not null,
  status text not null default 'proposed',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logbook_mutations_status_idx
on public.logbook_mutations (status, created_at desc);

create table if not exists public.policy_decisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.epistemic_events(id),
  allow_llm boolean not null default false,
  allow_proposal boolean not null default false,
  allow_execution boolean not null default false,
  requires_approval boolean not null default true,
  max_tokens integer not null default 0,
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists policy_decisions_event_idx
on public.policy_decisions (event_id, created_at desc);

create table if not exists public.mihm_analyses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid null references public.epistemic_events(id),
  actor_id uuid null,
  input_hash text not null,
  detected_dimensions jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  tensions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  homeostatic_vector jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mihm_analyses_created_idx
on public.mihm_analyses (created_at desc);

alter table public.action_proposals enable row level security;
alter table public.logbook_mutations enable row level security;
alter table public.policy_decisions enable row level security;
alter table public.mihm_analyses enable row level security;
