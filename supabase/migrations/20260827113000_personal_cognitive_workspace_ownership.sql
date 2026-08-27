-- Personal Cognitive/Lab workspace ownership.
-- Institutional rows remain owner_id IS NULL and continue to be service/ROOT managed.
-- Normal users may only read rows that are explicitly bound to their auth.uid().

alter table public.sfi_cognitive_twin_runs
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.sfi_cognitive_twin_runs
  add column if not exists case_id uuid references public.field_cases(id) on delete set null;

alter table public.sfi_lab_analyses
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists sfi_cognitive_twin_runs_owner_created_idx
  on public.sfi_cognitive_twin_runs(owner_id, created_at desc)
  where owner_id is not null;

create index if not exists sfi_cognitive_twin_runs_owner_case_idx
  on public.sfi_cognitive_twin_runs(owner_id, case_id, created_at desc)
  where owner_id is not null;

create index if not exists sfi_lab_analyses_owner_created_idx
  on public.sfi_lab_analyses(owner_id, created_at desc)
  where owner_id is not null;

alter table public.sfi_cognitive_twin_runs enable row level security;
alter table public.sfi_lab_analyses enable row level security;

drop policy if exists sfi_cognitive_twin_runs_owner_read on public.sfi_cognitive_twin_runs;
create policy sfi_cognitive_twin_runs_owner_read on public.sfi_cognitive_twin_runs
for select to authenticated
using (owner_id = auth.uid());

drop policy if exists sfi_lab_analyses_owner_read on public.sfi_lab_analyses;
create policy sfi_lab_analyses_owner_read on public.sfi_lab_analyses
for select to authenticated
using (owner_id = auth.uid());

comment on column public.sfi_cognitive_twin_runs.owner_id is
  'Null for institutional runs; auth user id for private personal-workspace runs.';

comment on column public.sfi_lab_analyses.owner_id is
  'Null for institutional Method Lab analyses; auth user id for private personal simulations.';
