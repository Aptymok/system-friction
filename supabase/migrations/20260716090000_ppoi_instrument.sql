create sequence if not exists public.ppoi_fp_code_seq start 1;

create table if not exists public.ppoi_phenomena (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  fp_code text not null unique default ('FP-' || lpad(nextval('public.ppoi_fp_code_seq')::text, 6, '0')),
  name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED')),
  is_calibration_case boolean not null default false,
  related_studio_object_id uuid,
  opened_at timestamptz not null default now(),
  last_evidence_at timestamptz,
  current_indices jsonb,
  current_composite numeric,
  indices_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ppoi_evidence (
  id uuid primary key default gen_random_uuid(),
  phenomenon_id uuid not null references public.ppoi_phenomena(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  evidence_hash text not null,
  evidence_type text not null,
  source text not null,
  domain text not null,
  content_url text,
  content_text text,
  generates_artifact boolean not null default false,
  artifact_note text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (phenomenon_id, evidence_hash)
);

create table if not exists public.ppoi_hypotheses (
  id uuid primary key default gen_random_uuid(),
  phenomenon_id uuid not null references public.ppoi_phenomena(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  generated_at timestamptz not null default now(),
  direction text not null,
  rationale text not null,
  rival_direction text not null,
  rival_rationale text not null,
  index_snapshot jsonb not null,
  composite_snapshot numeric,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ppoi_phenomena_owner_idx on public.ppoi_phenomena(owner_id, opened_at desc);
create index if not exists ppoi_evidence_phenomenon_idx on public.ppoi_evidence(phenomenon_id, observed_at asc);
create index if not exists ppoi_evidence_owner_idx on public.ppoi_evidence(owner_id, created_at desc);
create index if not exists ppoi_hypotheses_phenomenon_idx on public.ppoi_hypotheses(phenomenon_id, generated_at desc);
create unique index if not exists ppoi_hypotheses_current_unique on public.ppoi_hypotheses(phenomenon_id) where is_current;

alter table public.ppoi_phenomena enable row level security;
alter table public.ppoi_evidence enable row level security;
alter table public.ppoi_hypotheses enable row level security;

drop policy if exists ppoi_phenomena_owner_select on public.ppoi_phenomena;
create policy ppoi_phenomena_owner_select on public.ppoi_phenomena for select to authenticated using (owner_id = auth.uid());
drop policy if exists ppoi_phenomena_owner_insert on public.ppoi_phenomena;
create policy ppoi_phenomena_owner_insert on public.ppoi_phenomena for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists ppoi_phenomena_owner_update on public.ppoi_phenomena;
create policy ppoi_phenomena_owner_update on public.ppoi_phenomena for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists ppoi_phenomena_owner_delete on public.ppoi_phenomena;
create policy ppoi_phenomena_owner_delete on public.ppoi_phenomena for delete to authenticated using (owner_id = auth.uid());

drop policy if exists ppoi_evidence_owner_select on public.ppoi_evidence;
create policy ppoi_evidence_owner_select on public.ppoi_evidence for select to authenticated using (owner_id = auth.uid());
drop policy if exists ppoi_evidence_owner_insert on public.ppoi_evidence;
create policy ppoi_evidence_owner_insert on public.ppoi_evidence for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists ppoi_evidence_owner_delete on public.ppoi_evidence;
create policy ppoi_evidence_owner_delete on public.ppoi_evidence for delete to authenticated using (owner_id = auth.uid());

drop policy if exists ppoi_hypotheses_owner_select on public.ppoi_hypotheses;
create policy ppoi_hypotheses_owner_select on public.ppoi_hypotheses for select to authenticated using (owner_id = auth.uid());
drop policy if exists ppoi_hypotheses_owner_insert on public.ppoi_hypotheses;
create policy ppoi_hypotheses_owner_insert on public.ppoi_hypotheses for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists ppoi_hypotheses_owner_update on public.ppoi_hypotheses;
create policy ppoi_hypotheses_owner_update on public.ppoi_hypotheses for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
