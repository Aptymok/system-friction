-- SFI Commercial Conversion Layer
-- Separates internal action proposals from client-facing commercial proposals.
-- All access is server-side through service_role and ROOT authorization.

create table if not exists public.commercial_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  status text not null default 'prospect' check (status in ('prospect','active','inactive','archived')),
  sector text,
  website text,
  primary_contact jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.commercial_clients(id) on delete cascade,
  title text not null,
  problem_statement text not null,
  recommended_offer text,
  stage text not null default 'identified' check (stage in (
    'identified','qualified','scoping','proposal','negotiation','won','lost','archived'
  )),
  estimated_value numeric,
  currency text not null default 'MXN',
  probability numeric not null default 0 check (probability >= 0 and probability <= 1),
  source_action_proposal_id uuid references public.action_proposals(id) on delete set null,
  source_evidence_ids uuid[] not null default '{}'::uuid[],
  owner_id uuid,
  next_action text,
  next_action_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_proposals (
  id uuid primary key default gen_random_uuid(),
  proposal_number text not null unique,
  client_id uuid not null references public.commercial_clients(id) on delete restrict,
  opportunity_id uuid not null references public.commercial_opportunities(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft','internal_review','approved','sent','viewed','negotiation',
    'accepted','rejected','expired','converted'
  )),
  title text not null,
  diagnosis text not null,
  service_scope text not null,
  deliverables jsonb not null default '[]'::jsonb,
  duration_days integer check (duration_days is null or duration_days > 0),
  price_amount numeric check (price_amount is null or price_amount >= 0),
  currency text not null default 'MXN',
  assumptions jsonb not null default '[]'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  evidence_ids uuid[] not null default '{}'::uuid[],
  source_action_proposal_ids uuid[] not null default '{}'::uuid[],
  valid_until date,
  approved_by uuid,
  approved_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_proposal_versions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (proposal_id, version)
);

create table if not exists public.commercial_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.commercial_proposals(id) on delete cascade,
  opportunity_id uuid references public.commercial_opportunities(id) on delete cascade,
  client_id uuid references public.commercial_clients(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists commercial_clients_name_lower_idx
  on public.commercial_clients (lower(name));
create index if not exists commercial_clients_status_idx
  on public.commercial_clients (status, updated_at desc);
create index if not exists commercial_opportunities_stage_idx
  on public.commercial_opportunities (stage, updated_at desc);
create index if not exists commercial_opportunities_client_idx
  on public.commercial_opportunities (client_id, updated_at desc);
create index if not exists commercial_proposals_status_idx
  on public.commercial_proposals (status, updated_at desc);
create index if not exists commercial_proposals_client_idx
  on public.commercial_proposals (client_id, updated_at desc);
create index if not exists commercial_proposal_events_proposal_idx
  on public.commercial_proposal_events (proposal_id, occurred_at desc);

alter table public.commercial_clients enable row level security;
alter table public.commercial_opportunities enable row level security;
alter table public.commercial_proposals enable row level security;
alter table public.commercial_proposal_versions enable row level security;
alter table public.commercial_proposal_events enable row level security;

drop policy if exists commercial_clients_service_all on public.commercial_clients;
create policy commercial_clients_service_all on public.commercial_clients
  for all to service_role using (true) with check (true);

drop policy if exists commercial_opportunities_service_all on public.commercial_opportunities;
create policy commercial_opportunities_service_all on public.commercial_opportunities
  for all to service_role using (true) with check (true);

drop policy if exists commercial_proposals_service_all on public.commercial_proposals;
create policy commercial_proposals_service_all on public.commercial_proposals
  for all to service_role using (true) with check (true);

drop policy if exists commercial_proposal_versions_service_all on public.commercial_proposal_versions;
create policy commercial_proposal_versions_service_all on public.commercial_proposal_versions
  for all to service_role using (true) with check (true);

drop policy if exists commercial_proposal_events_service_all on public.commercial_proposal_events;
create policy commercial_proposal_events_service_all on public.commercial_proposal_events
  for all to service_role using (true) with check (true);
