create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null default 'observador',
  email text not null,
  role text not null default 'observer',
  subscription_tier text not null default 'free',
  module_access jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists alias text not null default 'observador',
  add column if not exists email text,
  add column if not exists role text not null default 'observer',
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists module_access jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
check (role in ('observer', 'operator', 'controller', 'root', 'system'));

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source text not null default 'web',
  current_ihg numeric not null default 0,
  current_nti numeric not null default 0.5,
  current_ldi numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nodes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists source text not null default 'web',
  add column if not exists current_ihg numeric not null default 0,
  add column if not exists current_nti numeric not null default 0.5,
  add column if not exists current_ldi numeric not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.action_proposals (
  id uuid primary key default gen_random_uuid(),
  title text,
  description text,
  status text not null default 'draft',
  risk_level text not null default 'low',
  expected_field_delta jsonb not null default '{}'::jsonb,
  proportionality_check jsonb not null default '{}'::jsonb,
  approval_required boolean not null default true,
  event_id uuid,
  outcome jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  executed_at timestamptz
);

alter table public.action_proposals
  add column if not exists proposal_type text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists objective text,
  add column if not exists status text not null default 'draft',
  add column if not exists risk_level text not null default 'low',
  add column if not exists expected_field_delta jsonb not null default '{}'::jsonb,
  add column if not exists proportionality_check jsonb not null default '{}'::jsonb,
  add column if not exists approval_required boolean not null default true,
  add column if not exists event_id uuid,
  add column if not exists outcome jsonb,
  add column if not exists approved_at timestamptz,
  add column if not exists executed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.logbook_mutations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  mutation_key text,
  target text,
  current_state jsonb,
  proposed_state jsonb,
  coherence_delta numeric not null default 0,
  status text not null default 'queued',
  proposal_id uuid,
  actor_id uuid,
  mutation_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.logbook_mutations
  add column if not exists event_id uuid,
  add column if not exists mutation_key text,
  add column if not exists target text,
  add column if not exists current_state jsonb,
  add column if not exists proposed_state jsonb,
  add column if not exists coherence_delta numeric not null default 0,
  add column if not exists status text not null default 'queued',
  add column if not exists proposal_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists mutation_type text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.mihm_analyses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid,
  actor_id uuid,
  input_hash text,
  detected_dimensions jsonb not null default '[]'::jsonb,
  claims jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  tensions jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0,
  homeostatic_vector jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(account_id, user_id)
);

create table if not exists public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_id uuid,
  kind text not null,
  amount numeric not null default 0,
  unit text not null default 'credit',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.account_balance (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  balance numeric not null default 0,
  reserved numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_balance
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.root_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  payload jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.root_evidence_entries (
  id uuid primary key default gen_random_uuid(),
  evidence_hash text not null unique,
  actor_id uuid references auth.users(id) on delete set null,
  title text not null,
  content text not null,
  evidence_type text not null default 'root_evidence',
  target_node_id text,
  payload jsonb not null default '{}'::jsonb,
  epistemic_event_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists nodes_user_id_idx on public.nodes(user_id);
create index if not exists action_proposals_status_idx on public.action_proposals(status, created_at desc);
create index if not exists logbook_mutations_status_idx on public.logbook_mutations(status, created_at desc);
create index if not exists mihm_analyses_created_idx on public.mihm_analyses(created_at desc);
create index if not exists root_audit_events_actor_idx on public.root_audit_events(actor_id, created_at desc);
create index if not exists root_evidence_entries_created_idx on public.root_evidence_entries(created_at desc);
create index if not exists usage_ledger_account_idx on public.usage_ledger(account_id, created_at desc);

alter table public.accounts enable row level security;
alter table public.account_members enable row level security;
alter table public.usage_ledger enable row level security;
alter table public.account_balance enable row level security;
alter table public.root_audit_events enable row level security;
alter table public.root_evidence_entries enable row level security;
