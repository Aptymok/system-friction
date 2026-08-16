create extension if not exists pgcrypto;

-- SFI Case Platform Operational V1
-- Commercial/client state is tenant-scoped and remains separate from institutional memory/evidence.

create table if not exists public.sfi_tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_key text not null unique,
  name text not null,
  tenant_type text not null default 'CLIENT' check (tenant_type in ('PERSONAL','CLIENT','INTERNAL','RESEARCH')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','CLOSED')),
  created_by uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_tenant_members (
  tenant_id uuid not null references public.sfi_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'VIEWER' check (role in ('OWNER','ADMIN','OPERATOR','VIEWER','AUDITOR')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function public.sfi_seed_tenant_owner()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.sfi_tenant_members (tenant_id, user_id, role, status)
  values (new.id, new.created_by, 'OWNER', 'ACTIVE')
  on conflict (tenant_id, user_id) do update
    set role = 'OWNER', status = 'ACTIVE', updated_at = now();
  return new;
end;
$$;

drop trigger if exists sfi_seed_tenant_owner_trigger on public.sfi_tenants;
create trigger sfi_seed_tenant_owner_trigger
after insert on public.sfi_tenants
for each row execute function public.sfi_seed_tenant_owner();

create or replace function public.sfi_tenant_can_read(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sfi_tenant_members m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.sfi_tenant_can_write(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.sfi_tenant_members m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role in ('OWNER','ADMIN','OPERATOR')
  );
$$;

revoke all on function public.sfi_tenant_can_read(uuid) from public;
revoke all on function public.sfi_tenant_can_write(uuid) from public;
grant execute on function public.sfi_tenant_can_read(uuid) to authenticated;
grant execute on function public.sfi_tenant_can_write(uuid) to authenticated;

create table if not exists public.sfi_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  tenant_id uuid not null references public.sfi_tenants(id) on delete restrict,
  client_id text,
  contract_version text not null default 'SFI-CASE-1.0' check (contract_version = 'SFI-CASE-1.0'),
  version text not null default '1.0',
  service_profile_id text not null check (service_profile_id in (
    'SYSTEM_OBSERVATORY',
    'AI_IMPLEMENTATION_DIAGNOSTIC',
    'AI_ADOPTION_INTEGRATION',
    'AI_GOVERNANCE_ASSURANCE',
    'SERVICE_OBSERVABILITY',
    'CONTRACT_WARRANTY_ASSURANCE',
    'TENDER_ASSURANCE',
    'ENTERPRISE_MEMORY',
    'COGNITIVE_RECONSTRUCTION',
    'CUSTOM_RESEARCH'
  )),
  subject text not null,
  scope text not null,
  system_boundary_ref jsonb not null,
  temporal_window jsonb not null,
  lineage jsonb not null default '{"parentCaseRefs":[],"sourceCutoff":""}'::jsonb,
  uncertainty jsonb not null default '{"determinability":"UNDETERMINED","confidence":null,"unresolvedQuestionRefs":[],"contradictionRefs":[]}'::jsonb,
  governance jsonb not null default '{"rootAddressable":false,"institutionalAdmission":"GATED","actionRequiresGovernance":true,"governanceDecisionRefs":[]}'::jsonb,
  status text not null default 'OPEN' check (status in ('DRAFT','OPEN','OBSERVING','ANALYZING','AWAITING_GOVERNANCE','INTERVENING','AWAITING_RETURN','CLOSED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz,
  unique (id, owner_id, tenant_id),
  check (coalesce(system_boundary_ref->>'id','') <> ''),
  check (coalesce(temporal_window->>'cutoff','') <> ''),
  check (governance @> '{"rootAddressable":false,"institutionalAdmission":"GATED","actionRequiresGovernance":true}'::jsonb)
);

create table if not exists public.sfi_case_objects (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  owner_id uuid not null,
  tenant_id uuid not null,
  object_kind text not null check (object_kind in (
    'SOURCE','RECORD','EVIDENCE','SYSTEM_MODEL','OBSERVATION','FRICTION','PERTURBATION','TRAJECTORY','ATTRACTOR',
    'EPISTEMIC_ASSESSMENT','HYPOTHESIS','INSTRUMENT_RUN','ANALYSIS','RECOMMENDATION','INTERVENTION','RETURN','REPORT',
    'GOVERNANCE_DECISION','UNRESOLVED_QUESTION','CONTRADICTION'
  )),
  epistemic_role text not null check (epistemic_role in (
    'SOURCE','RECORD','EVIDENCE','EPISTEMIC_ASSESSMENT','INFERENCE','SIMULATION','PROJECTION',
    'COGNITIVE_STATE','COGNITIVE_EXECUTION','GOVERNANCE_DECISION','TRUTH_CLAIM'
  )),
  canonical_ref jsonb not null,
  source_refs jsonb not null default '[]'::jsonb,
  record_refs jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (case_id, owner_id, tenant_id) references public.sfi_cases(id, owner_id, tenant_id) on delete cascade,
  check (coalesce(canonical_ref->>'id','') <> ''),
  check (
    case
      when object_kind = 'SOURCE' then epistemic_role = 'SOURCE'
      when object_kind = 'RECORD' then epistemic_role = 'RECORD'
      when object_kind = 'EVIDENCE' then epistemic_role = 'EVIDENCE'
      when object_kind = 'EPISTEMIC_ASSESSMENT' then epistemic_role = 'EPISTEMIC_ASSESSMENT'
      when object_kind = 'GOVERNANCE_DECISION' then epistemic_role = 'GOVERNANCE_DECISION'
      else epistemic_role not in ('SOURCE','EVIDENCE','GOVERNANCE_DECISION','TRUTH_CLAIM')
    end
  )
);

create unique index if not exists sfi_case_objects_semantic_identity_idx
  on public.sfi_case_objects(case_id, object_kind, ((canonical_ref->>'id')));

create table if not exists public.sfi_case_reports (
  id uuid primary key,
  case_id uuid not null,
  owner_id uuid not null,
  tenant_id uuid not null,
  report_contract text not null default 'SFI-REPORT-1.0' check (report_contract = 'SFI-REPORT-1.0'),
  version text not null default '1.0',
  report_payload jsonb not null,
  execution_authority boolean not null default false check (execution_authority = false),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  foreign key (case_id, owner_id, tenant_id) references public.sfi_cases(id, owner_id, tenant_id) on delete cascade
);

create table if not exists public.sfi_case_audit_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.sfi_cases(id) on delete cascade,
  tenant_id uuid not null references public.sfi_tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sfi_tenant_members_user_idx on public.sfi_tenant_members(user_id, status);
create index if not exists sfi_cases_tenant_updated_idx on public.sfi_cases(tenant_id, updated_at desc) where deleted_at is null;
create index if not exists sfi_cases_owner_updated_idx on public.sfi_cases(owner_id, updated_at desc) where deleted_at is null;
create index if not exists sfi_case_objects_case_created_idx on public.sfi_case_objects(case_id, created_at);
create index if not exists sfi_case_objects_kind_idx on public.sfi_case_objects(case_id, object_kind, created_at);
create index if not exists sfi_case_reports_case_generated_idx on public.sfi_case_reports(case_id, generated_at desc);
create index if not exists sfi_case_audit_case_created_idx on public.sfi_case_audit_events(case_id, created_at);

create or replace function public.sfi_case_platform_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sfi_tenants_touch_updated_at on public.sfi_tenants;
create trigger sfi_tenants_touch_updated_at
before update on public.sfi_tenants
for each row execute function public.sfi_case_platform_touch_updated_at();

drop trigger if exists sfi_tenant_members_touch_updated_at on public.sfi_tenant_members;
create trigger sfi_tenant_members_touch_updated_at
before update on public.sfi_tenant_members
for each row execute function public.sfi_case_platform_touch_updated_at();

drop trigger if exists sfi_cases_touch_updated_at on public.sfi_cases;
create trigger sfi_cases_touch_updated_at
before update on public.sfi_cases
for each row execute function public.sfi_case_platform_touch_updated_at();

alter table public.sfi_tenants enable row level security;
alter table public.sfi_tenant_members enable row level security;
alter table public.sfi_cases enable row level security;
alter table public.sfi_case_objects enable row level security;
alter table public.sfi_case_reports enable row level security;
alter table public.sfi_case_audit_events enable row level security;

drop policy if exists sfi_tenants_member_read on public.sfi_tenants;
create policy sfi_tenants_member_read on public.sfi_tenants
for select to authenticated using (public.sfi_tenant_can_read(id));

drop policy if exists sfi_tenants_self_create on public.sfi_tenants;
create policy sfi_tenants_self_create on public.sfi_tenants
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists sfi_tenants_member_update on public.sfi_tenants;
create policy sfi_tenants_member_update on public.sfi_tenants
for update to authenticated using (public.sfi_tenant_can_write(id)) with check (public.sfi_tenant_can_write(id));

drop policy if exists sfi_tenant_members_member_read on public.sfi_tenant_members;
create policy sfi_tenant_members_member_read on public.sfi_tenant_members
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_tenant_members_admin_insert on public.sfi_tenant_members;
create policy sfi_tenant_members_admin_insert on public.sfi_tenant_members
for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id));

drop policy if exists sfi_tenant_members_admin_update on public.sfi_tenant_members;
create policy sfi_tenant_members_admin_update on public.sfi_tenant_members
for update to authenticated using (public.sfi_tenant_can_write(tenant_id)) with check (public.sfi_tenant_can_write(tenant_id));

drop policy if exists sfi_cases_tenant_read on public.sfi_cases;
create policy sfi_cases_tenant_read on public.sfi_cases
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_cases_tenant_insert on public.sfi_cases;
create policy sfi_cases_tenant_insert on public.sfi_cases
for insert to authenticated with check (owner_id = auth.uid() and public.sfi_tenant_can_write(tenant_id));

drop policy if exists sfi_cases_tenant_update on public.sfi_cases;
create policy sfi_cases_tenant_update on public.sfi_cases
for update to authenticated using (public.sfi_tenant_can_write(tenant_id)) with check (public.sfi_tenant_can_write(tenant_id));

drop policy if exists sfi_case_objects_tenant_read on public.sfi_case_objects;
create policy sfi_case_objects_tenant_read on public.sfi_case_objects
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_case_objects_tenant_insert on public.sfi_case_objects;
create policy sfi_case_objects_tenant_insert on public.sfi_case_objects
for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id));

drop policy if exists sfi_case_reports_tenant_read on public.sfi_case_reports;
create policy sfi_case_reports_tenant_read on public.sfi_case_reports
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_case_reports_tenant_insert on public.sfi_case_reports;
create policy sfi_case_reports_tenant_insert on public.sfi_case_reports
for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id) and execution_authority = false);

drop policy if exists sfi_case_audit_tenant_read on public.sfi_case_audit_events;
create policy sfi_case_audit_tenant_read on public.sfi_case_audit_events
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_case_audit_tenant_insert on public.sfi_case_audit_events;
create policy sfi_case_audit_tenant_insert on public.sfi_case_audit_events
for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id) and actor_id = auth.uid());

-- No client-facing DELETE policies are created. Case history is retained for lineage/audit.
-- No trigger or policy writes to sfi_evidence_ledger, institutional memory, Cognitive Spine or ROOT.
