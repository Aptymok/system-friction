-- SFI Case Governed Action V1
-- REPORT ≠ ACTION. Case-level human authority gates interventions without routing clients to ROOT.

create table if not exists public.sfi_case_action_proposals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  owner_id uuid not null,
  tenant_id uuid not null,
  recommendation_ref jsonb not null,
  action_payload jsonb not null,
  risk_level text not null default 'MEDIUM' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  reversibility text not null default 'UNKNOWN' check (reversibility in ('REVERSIBLE','PARTIALLY_REVERSIBLE','IRREVERSIBLE','UNKNOWN')),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','CANCELLED','EXECUTED','RETURN_RECORDED')),
  proposed_by uuid not null references auth.users(id) on delete restrict,
  intervention_ref jsonb,
  return_ref jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (case_id, owner_id, tenant_id) references public.sfi_cases(id, owner_id, tenant_id) on delete cascade,
  check (coalesce(recommendation_ref->>'id','') <> ''),
  check (coalesce(action_payload->>'action','') <> '')
);

create table if not exists public.sfi_case_action_decisions (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.sfi_case_action_proposals(id) on delete cascade,
  case_id uuid not null references public.sfi_cases(id) on delete cascade,
  tenant_id uuid not null references public.sfi_tenants(id) on delete cascade,
  decision text not null check (decision in ('APPROVE','REJECT')),
  authority_role text not null check (authority_role in ('OWNER','ADMIN')),
  decided_by uuid not null references auth.users(id) on delete restrict,
  rationale text,
  created_at timestamptz not null default now()
);

create index if not exists sfi_case_action_proposals_case_status_idx on public.sfi_case_action_proposals(case_id, status, created_at);
create index if not exists sfi_case_action_proposals_tenant_status_idx on public.sfi_case_action_proposals(tenant_id, status, created_at);
create index if not exists sfi_case_action_decisions_case_idx on public.sfi_case_action_decisions(case_id, created_at);

create or replace function public.sfi_case_action_touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists sfi_case_action_proposals_touch on public.sfi_case_action_proposals;
create trigger sfi_case_action_proposals_touch before update on public.sfi_case_action_proposals for each row execute function public.sfi_case_action_touch_updated_at();

create or replace function public.sfi_tenant_can_approve(target_tenant uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.sfi_tenant_members m
    where m.tenant_id = target_tenant and m.user_id = auth.uid() and m.status = 'ACTIVE' and m.role in ('OWNER','ADMIN')
  );
$$;
revoke all on function public.sfi_tenant_can_approve(uuid) from public;
grant execute on function public.sfi_tenant_can_approve(uuid) to authenticated;

alter table public.sfi_case_action_proposals enable row level security;
alter table public.sfi_case_action_decisions enable row level security;

drop policy if exists sfi_case_action_proposals_tenant_read on public.sfi_case_action_proposals;
create policy sfi_case_action_proposals_tenant_read on public.sfi_case_action_proposals for select to authenticated using (public.sfi_tenant_can_read(tenant_id));
drop policy if exists sfi_case_action_proposals_tenant_insert on public.sfi_case_action_proposals;
create policy sfi_case_action_proposals_tenant_insert on public.sfi_case_action_proposals for insert to authenticated with check (public.sfi_tenant_can_write(tenant_id) and proposed_by = auth.uid());
drop policy if exists sfi_case_action_proposals_tenant_update on public.sfi_case_action_proposals;
-- Proposal state transitions are server-governed; authenticated clients receive no direct UPDATE policy.

drop policy if exists sfi_case_action_decisions_tenant_read on public.sfi_case_action_decisions;
create policy sfi_case_action_decisions_tenant_read on public.sfi_case_action_decisions for select to authenticated using (public.sfi_tenant_can_read(tenant_id));
drop policy if exists sfi_case_action_decisions_tenant_insert on public.sfi_case_action_decisions;
create policy sfi_case_action_decisions_tenant_insert on public.sfi_case_action_decisions for insert to authenticated with check (
  public.sfi_tenant_can_approve(tenant_id) and decided_by = auth.uid() and authority_role in ('OWNER','ADMIN')
);

-- Harden pre-existing Case Platform tables against direct Supabase writes that would bypass Next/API semantic gates.
drop policy if exists sfi_case_objects_tenant_insert on public.sfi_case_objects;
create policy sfi_case_objects_tenant_insert on public.sfi_case_objects for insert to authenticated with check (
  public.sfi_tenant_can_write(tenant_id)
  and object_kind in ('RECORD','OBSERVATION')
  and epistemic_role = 'RECORD'
  and jsonb_array_length(evidence_refs) = 0
);

drop policy if exists sfi_case_relations_tenant_insert on public.sfi_case_relations;
create policy sfi_case_relations_tenant_insert on public.sfi_case_relations for insert to authenticated with check (
  public.sfi_tenant_can_write(tenant_id)
  and epistemic_role = 'RECORD'
  and jsonb_array_length(evidence_refs) = 0
);

drop policy if exists sfi_case_reports_tenant_insert on public.sfi_case_reports;
-- Report creation is server/institutional only in Operational V1.

drop policy if exists sfi_case_audit_tenant_insert on public.sfi_case_audit_events;
-- Audit events are server-generated only.

-- No DELETE policies. No ROOT foreign key. No automatic execution trigger.
