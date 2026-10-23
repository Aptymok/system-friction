-- Reality Chain extends the existing Case Platform writer/lock. No permission,
-- tenant, evidence, execution or institutional-authority expansion.
alter table public.sfi_cases add column if not exists closure_revision bigint not null default 0;

create or replace function public.sfi_case_revision_increment_v1() returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.status='CLOSED' and old.status<>'CLOSED' and (
    current_setting('sfi.case_atomic_close',true) is distinct from new.id::text
    or current_user is distinct from pg_get_userbyid((select proowner from pg_proc where oid=to_regprocedure('public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb)')))
  ) then raise exception 'SFI_CASE_CLOSURE_ATOMIC_REQUIRED'; end if;
  new.closure_revision := old.closure_revision + 1;
  return new;
end;
$$;
drop trigger if exists sfi_case_revision_increment on public.sfi_cases;
create trigger sfi_case_revision_increment before update on public.sfi_cases
for each row execute function public.sfi_case_revision_increment_v1();

-- All relevant child writes serialize on their existing case row. This also
-- covers direct legacy writers and prevents a checked-OPEN / inserted-after-close race.
create or replace function public.sfi_case_child_revision_v1() returns trigger
language plpgsql security invoker set search_path = public as $$
declare v_case public.sfi_cases%rowtype; v_case_id uuid; v_tenant_id uuid; v_report boolean;
begin
  if tg_op = 'DELETE' then v_case_id := old.case_id; v_tenant_id := old.tenant_id;
  else v_case_id := new.case_id; v_tenant_id := new.tenant_id; end if;
  if tg_op = 'UPDATE' and (new.case_id is distinct from old.case_id or new.tenant_id is distinct from old.tenant_id) then
    raise exception 'SFI_CASE_CHILD_IDENTITY_IMMUTABLE';
  end if;
  if tg_table_name='sfi_case_objects' and tg_op='UPDATE' and (new.object_kind is distinct from old.object_kind or new.canonical_ref is distinct from old.canonical_ref) then
    raise exception 'SFI_CASE_CHILD_IDENTITY_IMMUTABLE';
  end if;
  select * into v_case from public.sfi_cases where id=v_case_id and deleted_at is null for update;
  if not found then raise exception 'SFI_CASE_NOT_FOUND'; end if;
  if v_case.tenant_id is distinct from v_tenant_id then raise exception 'SFI_TENANT_FORBIDDEN'; end if;
  v_report := tg_table_name = 'sfi_case_reports';
  if tg_table_name = 'sfi_case_objects' then
    if tg_op='DELETE' then v_report := old.object_kind='REPORT'; else v_report := new.object_kind='REPORT'; end if;
  end if;
  if v_case.status='REJECTED' or (v_case.status='CLOSED' and not v_report) then
    raise exception 'SFI_CASE_OBJECT_WRITE_FORBIDDEN:%', v_case.status;
  end if;
  update public.sfi_cases set updated_at=now() where id=v_case_id;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists sfi_case_objects_revision on public.sfi_case_objects;
create trigger sfi_case_objects_revision before insert or update or delete on public.sfi_case_objects for each row execute function public.sfi_case_child_revision_v1();
drop trigger if exists sfi_case_reports_revision on public.sfi_case_reports;
create trigger sfi_case_reports_revision before insert or update or delete on public.sfi_case_reports for each row execute function public.sfi_case_child_revision_v1();
drop trigger if exists sfi_case_proposals_revision on public.sfi_case_action_proposals;
create trigger sfi_case_proposals_revision before insert or update or delete on public.sfi_case_action_proposals for each row execute function public.sfi_case_child_revision_v1();
drop trigger if exists sfi_case_decisions_revision on public.sfi_case_action_decisions;
create trigger sfi_case_decisions_revision before insert or update or delete on public.sfi_case_action_decisions for each row execute function public.sfi_case_child_revision_v1();

create or replace function public.sfi_close_case_atomic_v1(
  p_case_id uuid, p_actor_id uuid, p_expected_status text,
  p_expected_revision bigint, p_closure jsonb
) returns jsonb
language plpgsql security definer set search_path=public,auth as $$
declare v_case public.sfi_cases%rowtype; v_role text; v_mode text; v_report public.sfi_case_reports%rowtype; v_prior_guard text;
begin
  select * into v_case from public.sfi_cases where id=p_case_id and deleted_at is null for update;
  if not found then raise exception 'SFI_CASE_NOT_FOUND'; end if;
  select role into v_role from public.sfi_tenant_members
    where tenant_id=v_case.tenant_id and user_id=p_actor_id and status='ACTIVE';
  if v_role is null then raise exception 'SFI_TENANT_FORBIDDEN'; end if;
  if v_role not in ('OWNER','ADMIN','OPERATOR') then raise exception 'SFI_TENANT_WRITE_FORBIDDEN'; end if;
  if v_case.status is distinct from p_expected_status or v_case.closure_revision is distinct from p_expected_revision then
    raise exception 'SFI_CASE_TRANSITION_CONFLICT';
  end if;
  if v_case.status not in ('OPEN','OBSERVING','ANALYZING','AWAITING_GOVERNANCE','AWAITING_RETURN','AWAITING_USER_CLOSE') then
    raise exception 'SFI_CASE_TRANSITION_FORBIDDEN:%:CLOSED',v_case.status;
  end if;
  v_mode := coalesce(p_closure->>'mode','');
  if v_mode not in ('ADMINISTRATIVE','INCONCLUSIVE','CERTIFIED') then raise exception 'SFI_CASE_CLOSURE_MODE_INVALID'; end if;
  if v_mode <> 'CERTIFIED' and length(trim(coalesce(p_closure->>'reason','')))=0 then raise exception 'SFI_CASE_CLOSURE_REASON_REQUIRED'; end if;
  if v_mode <> 'ADMINISTRATIVE' then
    select * into v_report from public.sfi_case_reports r
      where r.case_id=p_case_id and r.tenant_id=v_case.tenant_id
        and r.id::text=p_closure->'reportRef'->>'id'
        and r.report_payload->'reconstruction'->>'inputHash'=p_closure->>'inputHash';
    if not found then raise exception 'SFI_CASE_CLOSURE_REPORT_REQUIRED'; end if;
    if not exists(select 1 from public.sfi_case_objects o where o.case_id=p_case_id
      and o.object_kind='REPORT' and o.canonical_ref->>'id'=v_report.id::text
      and o.canonical_ref->>'version'=v_report.version
      and o.canonical_ref->>'hash'=p_closure->'reportRef'->>'hash') then
      raise exception 'SFI_CASE_CLOSURE_REPORT_REQUIRED';
    end if;
    if v_mode='CERTIFIED' and (p_closure->'gaps' is distinct from '[]'::jsonb or p_closure->>'validated' is distinct from 'true') then
      raise exception 'SFI_CASE_CLOSURE_BLOCKED';
    end if;
    if v_mode='INCONCLUSIVE' and (jsonb_array_length(coalesce(v_report.report_payload->'reconstruction'->'gaps','[]'::jsonb))=0
      or length(trim(coalesce(v_report.report_payload->'reconstruction'->>'nextObservation','')))=0
      or jsonb_array_length(coalesce(v_report.report_payload->'reconstruction'->'narrative','[]'::jsonb))=0) then
      raise exception 'SFI_CASE_CLOSURE_REPORT_REQUIRED';
    end if;
  end if;
  v_prior_guard := current_setting('sfi.case_atomic_close',true);
  perform set_config('sfi.case_atomic_close',p_case_id::text,true);
  update public.sfi_cases set status='CLOSED', closed_at=now() where id=p_case_id;
  perform set_config('sfi.case_atomic_close',coalesce(v_prior_guard,''),true);
  insert into public.sfi_case_audit_events(case_id,tenant_id,actor_id,action,before_state,after_state,context)
    values(p_case_id,v_case.tenant_id,p_actor_id,'CASE_STATUS_CHANGED',jsonb_build_object('status',v_case.status),
      jsonb_build_object('status','CLOSED','closure',p_closure),jsonb_build_object('atomic',true,'writer','sfi_close_case_atomic_v1','validatedRevision',p_expected_revision));
  return jsonb_build_object('atomic',true,'caseId',p_case_id,'status','CLOSED','closure',p_closure);
end;
$$;
revoke all on function public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.sfi_close_case_atomic_v1(uuid,uuid,text,bigint,jsonb) to service_role;

-- Ensure the existing canonical object RPC is installed on providers that lack
-- its historical migration. Same function and authority; no second writer.
-- SFI canonical case-object atomic writer V1
-- Object persistence, case freshness and audit evidence are one PostgreSQL transaction.

create or replace function public.sfi_record_case_object_atomic_v1(
  p_case_id uuid,
  p_actor_id uuid,
  p_object jsonb,
  p_audit_action text default 'CASE_OBJECT_RECORDED',
  p_audit_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_case public.sfi_cases%rowtype;
  v_role text;
  v_id uuid;
  v_kind text;
  v_epistemic_role text;
  v_ref jsonb;
  v_ref_id text;
  v_ref_hash text;
  v_existing public.sfi_case_objects%rowtype;
  v_row public.sfi_case_objects%rowtype;
  v_observed_at timestamptz;
begin
  if p_object is null or jsonb_typeof(p_object) <> 'object' then
    raise exception 'SFI_CASE_OBJECT_ATOMIC_PACKET_INVALID';
  end if;
  if p_audit_context is null or jsonb_typeof(p_audit_context) <> 'object' then
    raise exception 'SFI_CASE_OBJECT_ATOMIC_AUDIT_CONTEXT_INVALID';
  end if;

  select * into v_case
  from public.sfi_cases
  where id = p_case_id and deleted_at is null
  for update;
  if not found then raise exception 'SFI_CASE_NOT_FOUND'; end if;

  select m.role into v_role
  from public.sfi_tenant_members m
  where m.tenant_id = v_case.tenant_id
    and m.user_id = p_actor_id
    and m.status = 'ACTIVE'
  limit 1;
  if v_role is null then raise exception 'SFI_TENANT_FORBIDDEN'; end if;
  if v_role not in ('OWNER','ADMIN','OPERATOR') then raise exception 'SFI_TENANT_WRITE_FORBIDDEN'; end if;

  v_id := nullif(p_object->>'id','')::uuid;
  v_kind := coalesce(p_object->>'kind','');
  v_epistemic_role := coalesce(p_object->>'epistemicRole','');
  v_ref := coalesce(p_object->'canonicalRef','{}'::jsonb);
  v_ref_id := coalesce(v_ref->>'id','');
  v_ref_hash := coalesce(v_ref->>'hash','');
  v_observed_at := nullif(p_object->>'observedAt','')::timestamptz;

  if v_id is null or v_kind = '' or v_epistemic_role = '' or v_ref_id = '' or v_ref_hash = '' then
    raise exception 'SFI_CASE_OBJECT_ATOMIC_FIELDS_REQUIRED';
  end if;
  if coalesce(nullif(trim(p_audit_action),''),'') = '' then
    raise exception 'SFI_CASE_OBJECT_ATOMIC_AUDIT_ACTION_REQUIRED';
  end if;
  if v_case.status = 'REJECTED' or (v_case.status = 'CLOSED' and v_kind <> 'REPORT') then
    raise exception 'SFI_CASE_OBJECT_WRITE_FORBIDDEN:%', v_case.status;
  end if;

  select * into v_existing
  from public.sfi_case_objects o
  where o.case_id = p_case_id
    and o.object_kind = v_kind
    and o.canonical_ref->>'id' = v_ref_id
  limit 1;
  if found then
    if v_existing.canonical_ref is distinct from v_ref
       or v_existing.epistemic_role is distinct from v_epistemic_role
       or v_existing.source_refs is distinct from coalesce(p_object->'sourceRefs','[]'::jsonb)
       or v_existing.record_refs is distinct from coalesce(p_object->'recordRefs','[]'::jsonb)
       or v_existing.evidence_refs is distinct from coalesce(p_object->'evidenceRefs','[]'::jsonb)
       or v_existing.payload is distinct from coalesce(p_object->'payload','{}'::jsonb)
       or v_existing.observed_at is distinct from v_observed_at then
      raise exception 'SFI_CASE_OBJECT_ID_CONFLICT';
    end if;
    return jsonb_build_object('object',to_jsonb(v_existing),'mutated',false,'atomic',true);
  end if;

  insert into public.sfi_case_objects (
    id, case_id, owner_id, tenant_id, object_kind, epistemic_role, canonical_ref,
    source_refs, record_refs, evidence_refs, payload, observed_at
  ) values (
    v_id,
    p_case_id,
    v_case.owner_id,
    v_case.tenant_id,
    v_kind,
    v_epistemic_role,
    v_ref,
    coalesce(p_object->'sourceRefs','[]'::jsonb),
    coalesce(p_object->'recordRefs','[]'::jsonb),
    coalesce(p_object->'evidenceRefs','[]'::jsonb),
    coalesce(p_object->'payload','{}'::jsonb),
    v_observed_at
  ) returning * into v_row;

  update public.sfi_cases
  set updated_at = now()
  where id = p_case_id;

  insert into public.sfi_case_audit_events (
    case_id, tenant_id, actor_id, action, before_state, after_state, context
  ) values (
    p_case_id,
    v_case.tenant_id,
    p_actor_id,
    trim(p_audit_action),
    null,
    jsonb_build_object(
      'objectId', v_row.id,
      'kind', v_row.object_kind,
      'epistemicRole', v_row.epistemic_role,
      'canonicalRef', v_row.canonical_ref
    ),
    p_audit_context || jsonb_build_object('atomic',true,'writer','sfi_record_case_object_atomic_v1')
  );

  return jsonb_build_object('object',to_jsonb(v_row),'mutated',true,'atomic',true);
end;
$$;

revoke all on function public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb) from public;
revoke all on function public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb) from anon;
revoke all on function public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb) from authenticated;
grant execute on function public.sfi_record_case_object_atomic_v1(uuid,uuid,jsonb,text,jsonb) to service_role;
