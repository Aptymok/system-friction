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
