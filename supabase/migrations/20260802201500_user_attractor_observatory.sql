-- SFI user attractor observatory.
-- Extends the owner-bound FIELD model with a calibrated attractor, contextual marks,
-- a private longitudinal graph and evidence assessments.

create table if not exists public.sfi_user_attractors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.field_cases(id) on delete cascade,
  moph_run_id uuid references public.field_moph_runs(id) on delete set null,
  source_window_id uuid,
  status text not null default 'CALIBRATING'
    check (status in ('INITIAL','CALIBRATING','DECLARED','RECALIBRATING','SUPERSEDED')),
  code text not null,
  label text not null,
  summary text not null,
  objective text not null,
  direction text not null,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  initial_payload jsonb not null default '{}'::jsonb,
  final_payload jsonb not null default '{}'::jsonb,
  perturbation jsonb not null default '{}'::jsonb,
  internal_hypothesis jsonb not null default '{}'::jsonb,
  declared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, case_id)
);

alter table public.field_participant_windows
  add column if not exists attractor_id uuid references public.sfi_user_attractors(id) on delete set null,
  add column if not exists calibration_kind text not null default 'INITIAL_ATTRACTOR',
  add column if not exists graph_seeded_at timestamptz;

alter table public.sfi_user_attractors
  drop constraint if exists sfi_user_attractors_source_window_id_fkey;
alter table public.sfi_user_attractors
  add constraint sfi_user_attractors_source_window_id_fkey
  foreign key (source_window_id) references public.field_participant_windows(id) on delete set null;

alter table public.field_participant_marks
  add column if not exists trigger_text text,
  add column if not exists activity text,
  add column if not exists location_context text,
  add column if not exists social_context text,
  add column if not exists thought_after text,
  add column if not exists feeling_after text,
  add column if not exists action_after text,
  add column if not exists intensity smallint check (intensity between 1 and 5),
  add column if not exists payload jsonb not null default '{}'::jsonb;

create table if not exists public.sfi_user_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.field_cases(id) on delete cascade,
  attractor_id uuid not null references public.sfi_user_attractors(id) on delete cascade,
  node_type text not null
    check (node_type in ('attractor','mark','event','evidence','intervention','return','learning')),
  label text not null,
  summary text,
  weight numeric not null default 0.5 check (weight >= 0 and weight <= 1),
  is_central boolean not null default false,
  source_type text,
  source_id text,
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_user_graph_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.field_cases(id) on delete cascade,
  attractor_id uuid not null references public.sfi_user_attractors(id) on delete cascade,
  source_node_id uuid not null references public.sfi_user_graph_nodes(id) on delete cascade,
  target_node_id uuid not null references public.sfi_user_graph_nodes(id) on delete cascade,
  relation text not null,
  strength numeric not null default 0.5 check (strength >= 0 and strength <= 1),
  direction text not null default 'toward_attractor'
    check (direction in ('toward_attractor','away_from_attractor','bidirectional','contextual')),
  curvature numeric not null default 0 check (curvature >= -1 and curvature <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sfi_user_evidence_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.field_cases(id) on delete cascade,
  attractor_id uuid not null references public.sfi_user_attractors(id) on delete cascade,
  evidence_id uuid not null references public.field_case_evidence(id) on delete cascade,
  status text not null
    check (status in ('ACCEPTED','PARTIAL','OBSERVED_NOT_INTEGRATED','REJECTED')),
  relevance numeric not null default 0 check (relevance >= 0 and relevance <= 1),
  traceability numeric not null default 0 check (traceability >= 0 and traceability <= 1),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  mihm_reading_id uuid references public.field_mihm_readings(id) on delete set null,
  reason text not null,
  next_action text not null,
  internal_hypothesis_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sfi_user_attractors_owner_idx
  on public.sfi_user_attractors(owner_id, updated_at desc);
create index if not exists sfi_user_attractors_case_idx
  on public.sfi_user_attractors(case_id);
create index if not exists sfi_user_graph_nodes_case_idx
  on public.sfi_user_graph_nodes(owner_id, case_id, observed_at desc);
create index if not exists sfi_user_graph_edges_case_idx
  on public.sfi_user_graph_edges(owner_id, case_id, created_at desc);
create index if not exists sfi_user_evidence_assessments_case_idx
  on public.sfi_user_evidence_assessments(owner_id, case_id, created_at desc);

alter table public.sfi_user_attractors enable row level security;
alter table public.sfi_user_graph_nodes enable row level security;
alter table public.sfi_user_graph_edges enable row level security;
alter table public.sfi_user_evidence_assessments enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'sfi_user_attractors',
    'sfi_user_graph_nodes',
    'sfi_user_graph_edges',
    'sfi_user_evidence_assessments'
  ] loop
    execute format('drop policy if exists %I_owner_select on public.%I', t, t);
    execute format('drop policy if exists %I_owner_insert on public.%I', t, t);
    execute format('drop policy if exists %I_owner_update on public.%I', t, t);
    execute format('drop policy if exists %I_owner_delete on public.%I', t, t);
    execute format('create policy %I_owner_select on public.%I for select to authenticated using (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_insert on public.%I for insert to authenticated with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_update on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_owner_delete on public.%I for delete to authenticated using (owner_id = auth.uid())', t, t);
  end loop;
end $$;
