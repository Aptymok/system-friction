-- SFI Final Operating Form
-- Adds the missing ACCOUNT > ATTRACTOR > TRAJECTORY > PROJECT > CASE aggregation layer
-- and reserves final case closure for an explicit authenticated user decision.
-- Existing case/evidence/history rows are preserved; no historical epistemic record is rewritten.

create table if not exists public.sfi_projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.sfi_tenants(id) on delete restrict,
  owner_id uuid not null references auth.users(id) on delete restrict,
  project_key text not null,
  name text not null,
  description text not null default '',
  attractor_ref jsonb,
  trajectory_ref jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, project_key),
  check (attractor_ref is null or coalesce(attractor_ref->>'id','') <> ''),
  check (trajectory_ref is null or coalesce(trajectory_ref->>'id','') <> '')
);

alter table public.sfi_projects enable row level security;

drop policy if exists sfi_projects_tenant_read on public.sfi_projects;
create policy sfi_projects_tenant_read on public.sfi_projects
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_projects_tenant_insert on public.sfi_projects;
create policy sfi_projects_tenant_insert on public.sfi_projects
for insert to authenticated with check (
  owner_id = auth.uid()
  and public.sfi_tenant_can_write(tenant_id)
);

drop policy if exists sfi_projects_tenant_update on public.sfi_projects;
create policy sfi_projects_tenant_update on public.sfi_projects
for update to authenticated using (public.sfi_tenant_can_write(tenant_id))
with check (public.sfi_tenant_can_write(tenant_id));

create index if not exists sfi_projects_tenant_updated_idx
  on public.sfi_projects(tenant_id, updated_at desc);

alter table public.sfi_cases
  add column if not exists project_id uuid references public.sfi_projects(id) on delete restrict;

create index if not exists sfi_cases_project_updated_idx
  on public.sfi_cases(project_id, updated_at desc)
  where deleted_at is null;

alter table public.sfi_cases drop constraint if exists sfi_cases_status_check;
alter table public.sfi_cases add constraint sfi_cases_status_check check (
  status in (
    'DRAFT','OPEN','OBSERVING','ANALYZING','AWAITING_GOVERNANCE',
    'INTERVENING','AWAITING_RETURN','AWAITING_USER_CLOSE','CLOSED','REJECTED'
  )
);

-- Projects and Cases retain history. No client-facing DELETE policy is introduced.
-- CLOSED remains a terminal status, but application authority now reaches it only
-- through an explicit user report decision recorded in sfi_case_audit_events.
