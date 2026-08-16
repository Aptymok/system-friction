-- SFI Enterprise Assurance Graph V1
-- Tenant-scoped relational continuity across tender → supplier → contract → asset/service → ticket/SLA → warranty → return → performance.

create table if not exists public.sfi_case_relations (
  id uuid primary key default gen_random_uuid(),
  relation_key text not null,
  case_id uuid not null,
  owner_id uuid not null,
  tenant_id uuid not null,
  relation_type text not null check (relation_type in (
    'TENDER_HAS_REQUIREMENT',
    'BIDDER_PARTICIPATES_IN_TENDER',
    'BID_SUBMISSION_FOR_TENDER',
    'BID_SUBMISSION_BY_BIDDER',
    'BIDDER_MAPS_TO_SUPPLIER',
    'TENDER_AWARDS_SUPPLIER',
    'CONTRACT_ARISES_FROM_TENDER',
    'CONTRACT_BINDS_SUPPLIER',
    'CONTRACT_DEFINES_OBLIGATION',
    'CONTRACT_COVERS_ASSET',
    'CONTRACT_COVERS_SERVICE',
    'ASSET_PROVIDED_BY_SUPPLIER',
    'SERVICE_PROVIDED_BY_SUPPLIER',
    'TICKET_AFFECTS_ASSET',
    'TICKET_AFFECTS_SERVICE',
    'TICKET_SUBJECT_TO_SLA',
    'TICKET_ASSIGNED_TO_SUPPLIER',
    'SLA_DERIVED_FROM_CONTRACT',
    'WARRANTY_DEFINED_BY_CONTRACT',
    'WARRANTY_COVERS_ASSET',
    'WARRANTY_EVENT_AFFECTS_ASSET',
    'WARRANTY_EVENT_UNDER_WARRANTY',
    'WARRANTY_EVENT_ASSIGNED_TO_SUPPLIER',
    'TICKET_TRIGGERS_WARRANTY_EVENT',
    'RETURN_RESOLVES_WARRANTY_EVENT',
    'RETURN_CLOSES_TICKET',
    'SUPPLIER_PERFORMANCE_AGGREGATES_RETURN',
    'SUPPLIER_PERFORMANCE_INFORMS_TENDER'
  )),
  epistemic_role text not null check (epistemic_role in ('RECORD','INFERENCE','EPISTEMIC_ASSESSMENT')),
  from_ref jsonb not null,
  to_ref jsonb not null,
  source_refs jsonb not null default '[]'::jsonb,
  record_refs jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (case_id, owner_id, tenant_id) references public.sfi_cases(id, owner_id, tenant_id) on delete cascade,
  unique (case_id, relation_key),
  check (coalesce(from_ref->>'id','') <> ''),
  check (coalesce(from_ref->>'entityType','') <> ''),
  check (coalesce(to_ref->>'id','') <> ''),
  check (coalesce(to_ref->>'entityType','') <> ''),
  check (epistemic_role <> 'INFERENCE' or jsonb_array_length(evidence_refs) > 0)
);

create index if not exists sfi_case_relations_case_created_idx
  on public.sfi_case_relations(case_id, created_at);
create index if not exists sfi_case_relations_tenant_type_idx
  on public.sfi_case_relations(tenant_id, relation_type, created_at);
create index if not exists sfi_case_relations_from_idx
  on public.sfi_case_relations(tenant_id, ((from_ref->>'entityType')), ((from_ref->>'id')));
create index if not exists sfi_case_relations_to_idx
  on public.sfi_case_relations(tenant_id, ((to_ref->>'entityType')), ((to_ref->>'id')));

alter table public.sfi_case_relations enable row level security;

drop policy if exists sfi_case_relations_tenant_read on public.sfi_case_relations;
create policy sfi_case_relations_tenant_read on public.sfi_case_relations
for select to authenticated using (public.sfi_tenant_can_read(tenant_id));

drop policy if exists sfi_case_relations_tenant_insert on public.sfi_case_relations;
create policy sfi_case_relations_tenant_insert on public.sfi_case_relations
for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id));

-- Deliberately no client-facing DELETE policy.
-- Deliberately no trigger into institutional graph/evidence/memory/ROOT.
