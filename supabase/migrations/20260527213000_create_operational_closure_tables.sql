alter table public.action_proposals
  add column if not exists proposal_type text,
  add column if not exists title text,
  add column if not exists objective text,
  add column if not exists objective_hash text,
  add column if not exists seed text,
  add column if not exists worldspect_snapshot_id uuid,
  add column if not exists graph_node_count integer not null default 0,
  add column if not exists graph_edge_count integer not null default 0,
  add column if not exists input_vector_hash text,
  add column if not exists spec_hash text,
  add column if not exists content_hash text,
  add column if not exists prompt_hash text,
  add column if not exists status text not null default 'queued',
  add column if not exists requires_approval boolean not null default true,
  add column if not exists actor_id uuid,
  add column if not exists event_id uuid,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.logbook_mutations
  add column if not exists proposal_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists mutation_type text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.policy_decisions
  add column if not exists event_id uuid,
  add column if not exists delta_decision_id uuid,
  add column if not exists allow_llm boolean not null default false,
  add column if not exists allow_proposal boolean not null default false,
  add column if not exists allow_execution boolean not null default false,
  add column if not exists requires_approval boolean not null default true,
  add column if not exists max_tokens integer not null default 0,
  add column if not exists reason text,
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.mihm_analyses
  add column if not exists event_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists input_hash text,
  add column if not exists detected_dimensions jsonb not null default '[]'::jsonb,
  add column if not exists claims jsonb not null default '[]'::jsonb,
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists tensions jsonb not null default '[]'::jsonb,
  add column if not exists risks jsonb not null default '[]'::jsonb,
  add column if not exists confidence numeric not null default 0,
  add column if not exists homeostatic_vector jsonb not null default '{}'::jsonb,
  add column if not exists payload jsonb not null default '{}'::jsonb;

create index if not exists action_proposals_type_status_idx
on public.action_proposals (proposal_type, status, created_at desc);

create index if not exists logbook_mutations_status_idx
on public.logbook_mutations (status, created_at desc);

create index if not exists policy_decisions_event_idx
on public.policy_decisions (event_id, created_at desc);

create index if not exists mihm_analyses_created_idx
on public.mihm_analyses (created_at desc);
