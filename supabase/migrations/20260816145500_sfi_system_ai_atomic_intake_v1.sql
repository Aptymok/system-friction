-- SFI System / AI Assurance atomic persistence V1
-- One packet = one transaction. Validation precedes mutation and no partial object/relation package can survive an exception.
-- Standalone relation writes use the same transactional/audited boundary.

create or replace function public.sfi_record_system_ai_intake_package_v1(
  p_case_id uuid,
  p_actor_id uuid,
  p_object jsonb,
  p_relations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_case public.sfi_cases%rowtype;
  v_role text;
  v_object_kind text;
  v_object_epistemic_role text;
  v_object_ref jsonb;
  v_object_ref_id text;
  v_object_hash text;
  v_object_entity_type text;
  v_object_contract text;
  v_existing_object public.sfi_case_objects%rowtype;
  v_object_exists boolean := false;
  v_object_id uuid;
  v_object_row jsonb;
  v_relation jsonb;
  v_relation_key text;
  v_relation_type text;
  v_relation_epistemic_role text;
  v_from jsonb;
  v_to jsonb;
  v_from_id text;
  v_to_id text;
  v_from_type text;
  v_to_type text;
  v_existing_relation public.sfi_case_relations%rowtype;
  v_relation_id uuid;
  v_relation_ids uuid[] := array[]::uuid[];
  v_relation_rows jsonb := '[]'::jsonb;
  v_mutated boolean := false;
begin
  if p_object is null or jsonb_typeof(p_object) <> 'object' then
    raise exception 'SFI_SYSTEM_AI_ATOMIC_OBJECT_INVALID';
  end if;
  if p_relations is null or jsonb_typeof(p_relations) <> 'array' then
    raise exception 'SFI_SYSTEM_AI_ATOMIC_RELATIONS_INVALID';
  end if;

  select * into v_case
  from public.sfi_cases
  where id = p_case_id and deleted_at is null
  for update;
  if not found then raise exception 'SFI_CASE_NOT_FOUND'; end if;

  if v_case.service_profile_id not in (
    'SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH'
  ) then
    raise exception 'SFI_CASE_SERVICE_PROFILE_FORBIDDEN:%', v_case.service_profile_id;
  end if;
  if v_case.status in ('CLOSED','REJECTED') then
    raise exception 'SFI_SYSTEM_AI_INTAKE_FORBIDDEN:%', v_case.status;
  end if;

  select m.role into v_role
  from public.sfi_tenant_members m
  where m.tenant_id = v_case.tenant_id
    and m.user_id = p_actor_id
    and m.status = 'ACTIVE'
  limit 1;
  if v_role is null then raise exception 'SFI_TENANT_FORBIDDEN'; end if;
  if v_role not in ('OWNER','ADMIN','OPERATOR') then raise exception 'SFI_TENANT_WRITE_FORBIDDEN'; end if;

  v_object_kind := coalesce(p_object->>'kind','');
  v_object_epistemic_role := coalesce(p_object->>'epistemicRole','');
  v_object_ref := coalesce(p_object->'canonicalRef','{}'::jsonb);
  v_object_ref_id := coalesce(v_object_ref->>'id','');
  v_object_hash := coalesce(v_object_ref->>'hash','');
  v_object_entity_type := coalesce(p_object#>>'{payload,entityType}','');
  v_object_contract := coalesce(p_object#>>'{payload,contract}','');
  if v_object_kind = '' or v_object_epistemic_role = '' or v_object_ref_id = '' or v_object_hash = '' or v_object_entity_type = '' then
    raise exception 'SFI_SYSTEM_AI_ATOMIC_OBJECT_FIELDS_REQUIRED';
  end if;
  if v_object_contract <> 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0' then
    raise exception 'SFI_SYSTEM_AI_PACKET_OBJECT_DOMAIN_INVALID';
  end if;

  select * into v_existing_object
  from public.sfi_case_objects o
  where o.case_id = p_case_id
    and o.object_kind = v_object_kind
    and o.canonical_ref->>'id' = v_object_ref_id
  limit 1;
  v_object_exists := found;
  if v_object_exists and v_existing_object.canonical_ref is distinct from v_object_ref then
    raise exception 'SFI_CASE_OBJECT_ID_CONFLICT';
  end if;

  -- Validate every relation and every endpoint before the first write.
  for v_relation in select value from jsonb_array_elements(p_relations)
  loop
    if jsonb_typeof(v_relation) <> 'object' then raise exception 'SFI_SYSTEM_AI_ATOMIC_RELATION_INVALID'; end if;
    v_relation_key := coalesce(v_relation->>'relationKey','');
    v_relation_type := coalesce(v_relation->>'relationType','');
    v_relation_epistemic_role := coalesce(v_relation->>'epistemicRole','');
    v_from := coalesce(v_relation->'from','{}'::jsonb);
    v_to := coalesce(v_relation->'to','{}'::jsonb);
    v_from_id := coalesce(v_from->>'id','');
    v_to_id := coalesce(v_to->>'id','');
    v_from_type := coalesce(v_from->>'entityType','');
    v_to_type := coalesce(v_to->>'entityType','');

    if v_relation_key = '' or v_relation_type = '' or v_relation_epistemic_role = '' or v_from_id = '' or v_to_id = '' or v_from_type = '' or v_to_type = '' then
      raise exception 'SFI_SYSTEM_AI_ATOMIC_RELATION_FIELDS_REQUIRED';
    end if;
    if v_relation_epistemic_role = 'INFERENCE'
       and jsonb_array_length(coalesce(v_relation->'evidenceRefs','[]'::jsonb)) = 0 then
      raise exception 'SFI_SYSTEM_AI_INFERRED_RELATION_REQUIRES_EVIDENCE';
    end if;
    if v_from_id <> v_object_ref_id and v_to_id <> v_object_ref_id then
      raise exception 'SFI_SYSTEM_AI_PACKAGE_RELATION_NOT_BOUND_TO_OBJECT:%', v_relation_key;
    end if;

    if v_from_id = v_object_ref_id then
      if v_from_type <> v_object_entity_type then raise exception 'SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_TYPE_MISMATCH'; end if;
      if coalesce(v_from->>'version','') <> coalesce(v_object_ref->>'version','')
         or coalesce(v_from->>'hash','') <> coalesce(v_object_ref->>'hash','') then
        raise exception 'SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_REVISION_MISMATCH';
      end if;
    else
      perform 1 from public.sfi_case_objects o
      where o.tenant_id = v_case.tenant_id
        and o.canonical_ref->>'id' = v_from_id
        and coalesce(o.canonical_ref->>'version','') = coalesce(v_from->>'version','')
        and coalesce(o.canonical_ref->>'hash','') = coalesce(v_from->>'hash','')
        and o.payload->>'entityType' = v_from_type
        and o.payload->>'contract' = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0'
      limit 1;
      if not found then raise exception 'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND:%:%', v_from_type, v_from_id; end if;
    end if;

    if v_to_id = v_object_ref_id then
      if v_to_type <> v_object_entity_type then raise exception 'SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_TYPE_MISMATCH'; end if;
      if coalesce(v_to->>'version','') <> coalesce(v_object_ref->>'version','')
         or coalesce(v_to->>'hash','') <> coalesce(v_object_ref->>'hash','') then
        raise exception 'SFI_SYSTEM_AI_PACKAGE_OBJECT_ENDPOINT_REVISION_MISMATCH';
      end if;
    else
      perform 1 from public.sfi_case_objects o
      where o.tenant_id = v_case.tenant_id
        and o.canonical_ref->>'id' = v_to_id
        and coalesce(o.canonical_ref->>'version','') = coalesce(v_to->>'version','')
        and coalesce(o.canonical_ref->>'hash','') = coalesce(v_to->>'hash','')
        and o.payload->>'entityType' = v_to_type
        and o.payload->>'contract' = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0'
      limit 1;
      if not found then raise exception 'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND:%:%', v_to_type, v_to_id; end if;
    end if;

    select * into v_existing_relation
    from public.sfi_case_relations r
    where r.case_id = p_case_id and r.relation_key = v_relation_key
    limit 1;
    if found then
      if v_existing_relation.relation_type <> v_relation_type
         or v_existing_relation.epistemic_role <> v_relation_epistemic_role
         or v_existing_relation.from_ref is distinct from v_from
         or v_existing_relation.to_ref is distinct from v_to
         or v_existing_relation.source_refs is distinct from coalesce(v_relation->'sourceRefs','[]'::jsonb)
         or v_existing_relation.record_refs is distinct from coalesce(v_relation->'recordRefs','[]'::jsonb)
         or v_existing_relation.evidence_refs is distinct from coalesce(v_relation->'evidenceRefs','[]'::jsonb)
         or v_existing_relation.payload is distinct from coalesce(v_relation->'payload','{}'::jsonb)
         or v_existing_relation.observed_at is distinct from nullif(v_relation->>'observedAt','')::timestamptz then
        raise exception 'SFI_SYSTEM_AI_RELATION_KEY_CONFLICT:%', v_relation_key;
      end if;
    end if;
  end loop;

  if v_object_exists then
    v_object_id := v_existing_object.id;
  else
    insert into public.sfi_case_objects (
      case_id, owner_id, tenant_id, object_kind, epistemic_role, canonical_ref,
      source_refs, record_refs, evidence_refs, payload, observed_at
    ) values (
      p_case_id, v_case.owner_id, v_case.tenant_id, v_object_kind, v_object_epistemic_role, v_object_ref,
      coalesce(p_object->'sourceRefs','[]'::jsonb),
      coalesce(p_object->'recordRefs','[]'::jsonb),
      coalesce(p_object->'evidenceRefs','[]'::jsonb),
      coalesce(p_object->'payload','{}'::jsonb),
      nullif(p_object->>'observedAt','')::timestamptz
    ) returning id into v_object_id;
    v_mutated := true;
  end if;

  for v_relation in select value from jsonb_array_elements(p_relations)
  loop
    v_relation_key := v_relation->>'relationKey';
    select * into v_existing_relation
    from public.sfi_case_relations r
    where r.case_id = p_case_id and r.relation_key = v_relation_key
    limit 1;
    if found then
      v_relation_id := v_existing_relation.id;
    else
      insert into public.sfi_case_relations (
        relation_key, case_id, owner_id, tenant_id, relation_type, epistemic_role,
        from_ref, to_ref, source_refs, record_refs, evidence_refs, payload, observed_at
      ) values (
        v_relation_key,
        p_case_id,
        v_case.owner_id,
        v_case.tenant_id,
        v_relation->>'relationType',
        v_relation->>'epistemicRole',
        v_relation->'from',
        v_relation->'to',
        coalesce(v_relation->'sourceRefs','[]'::jsonb),
        coalesce(v_relation->'recordRefs','[]'::jsonb),
        coalesce(v_relation->'evidenceRefs','[]'::jsonb),
        coalesce(v_relation->'payload','{}'::jsonb),
        nullif(v_relation->>'observedAt','')::timestamptz
      ) returning id into v_relation_id;
      v_mutated := true;
    end if;
    v_relation_ids := array_append(v_relation_ids, v_relation_id);
  end loop;

  if v_mutated then
    update public.sfi_cases set updated_at = now() where id = p_case_id;
    insert into public.sfi_case_audit_events (
      case_id, tenant_id, actor_id, action, after_state, context
    ) values (
      p_case_id,
      v_case.tenant_id,
      p_actor_id,
      'SYSTEM_AI_INTAKE_PACKAGE_RECORDED',
      jsonb_build_object('objectId',v_object_id,'relationIds',to_jsonb(v_relation_ids)),
      jsonb_build_object('contract','SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0','atomic',true)
    );
  end if;

  select to_jsonb(o) into v_object_row from public.sfi_case_objects o where o.id = v_object_id;
  if cardinality(v_relation_ids) > 0 then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at),'[]'::jsonb)
    into v_relation_rows
    from public.sfi_case_relations r
    where r.id = any(v_relation_ids);
  end if;

  return jsonb_build_object(
    'object', v_object_row,
    'relations', coalesce(v_relation_rows,'[]'::jsonb),
    'mutated', v_mutated,
    'atomic', true
  );
end;
$$;

revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from public;
revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from anon;
revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from authenticated;
grant execute on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) to service_role;

create or replace function public.sfi_record_system_ai_relation_v1(
  p_case_id uuid,
  p_actor_id uuid,
  p_relation jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_case public.sfi_cases%rowtype;
  v_role text;
  v_relation_key text;
  v_relation_type text;
  v_epistemic_role text;
  v_from jsonb;
  v_to jsonb;
  v_from_id text;
  v_to_id text;
  v_from_type text;
  v_to_type text;
  v_existing public.sfi_case_relations%rowtype;
  v_relation_row public.sfi_case_relations%rowtype;
  v_observed_at timestamptz;
begin
  if p_relation is null or jsonb_typeof(p_relation) <> 'object' then
    raise exception 'SFI_SYSTEM_AI_RELATION_INVALID';
  end if;

  select * into v_case
  from public.sfi_cases
  where id = p_case_id and deleted_at is null
  for update;
  if not found then raise exception 'SFI_CASE_NOT_FOUND'; end if;
  if v_case.service_profile_id not in (
    'SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH'
  ) then raise exception 'SFI_CASE_SERVICE_PROFILE_FORBIDDEN:%', v_case.service_profile_id; end if;
  if v_case.status in ('CLOSED','REJECTED') then raise exception 'SFI_SYSTEM_AI_RELATION_WRITE_FORBIDDEN:%', v_case.status; end if;

  select m.role into v_role
  from public.sfi_tenant_members m
  where m.tenant_id = v_case.tenant_id and m.user_id = p_actor_id and m.status = 'ACTIVE'
  limit 1;
  if v_role is null then raise exception 'SFI_TENANT_FORBIDDEN'; end if;
  if v_role not in ('OWNER','ADMIN','OPERATOR') then raise exception 'SFI_TENANT_WRITE_FORBIDDEN'; end if;

  v_relation_key := coalesce(p_relation->>'relationKey','');
  v_relation_type := coalesce(p_relation->>'relationType','');
  v_epistemic_role := coalesce(p_relation->>'epistemicRole','');
  v_from := coalesce(p_relation->'from','{}'::jsonb);
  v_to := coalesce(p_relation->'to','{}'::jsonb);
  v_from_id := coalesce(v_from->>'id','');
  v_to_id := coalesce(v_to->>'id','');
  v_from_type := coalesce(v_from->>'entityType','');
  v_to_type := coalesce(v_to->>'entityType','');
  v_observed_at := nullif(p_relation->>'observedAt','')::timestamptz;

  if v_relation_key = '' or v_relation_type = '' or v_epistemic_role = '' or v_from_id = '' or v_to_id = '' or v_from_type = '' or v_to_type = '' then
    raise exception 'SFI_SYSTEM_AI_RELATION_FIELDS_REQUIRED';
  end if;
  if v_epistemic_role = 'INFERENCE' and jsonb_array_length(coalesce(p_relation->'evidenceRefs','[]'::jsonb)) = 0 then
    raise exception 'SFI_SYSTEM_AI_INFERRED_RELATION_REQUIRES_EVIDENCE';
  end if;

  perform 1 from public.sfi_case_objects o
  where o.tenant_id = v_case.tenant_id
    and o.canonical_ref->>'id' = v_from_id
    and coalesce(o.canonical_ref->>'version','') = coalesce(v_from->>'version','')
    and coalesce(o.canonical_ref->>'hash','') = coalesce(v_from->>'hash','')
    and o.payload->>'entityType' = v_from_type
    and o.payload->>'contract' = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0'
  limit 1;
  if not found then raise exception 'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND:%:%', v_from_type, v_from_id; end if;

  perform 1 from public.sfi_case_objects o
  where o.tenant_id = v_case.tenant_id
    and o.canonical_ref->>'id' = v_to_id
    and coalesce(o.canonical_ref->>'version','') = coalesce(v_to->>'version','')
    and coalesce(o.canonical_ref->>'hash','') = coalesce(v_to->>'hash','')
    and o.payload->>'entityType' = v_to_type
    and o.payload->>'contract' = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0'
  limit 1;
  if not found then raise exception 'SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND:%:%', v_to_type, v_to_id; end if;

  select * into v_existing
  from public.sfi_case_relations r
  where r.case_id = p_case_id and r.relation_key = v_relation_key
  limit 1;
  if found then
    if v_existing.relation_type <> v_relation_type
       or v_existing.epistemic_role <> v_epistemic_role
       or v_existing.from_ref is distinct from v_from
       or v_existing.to_ref is distinct from v_to
       or v_existing.source_refs is distinct from coalesce(p_relation->'sourceRefs','[]'::jsonb)
       or v_existing.record_refs is distinct from coalesce(p_relation->'recordRefs','[]'::jsonb)
       or v_existing.evidence_refs is distinct from coalesce(p_relation->'evidenceRefs','[]'::jsonb)
       or v_existing.payload is distinct from coalesce(p_relation->'payload','{}'::jsonb)
       or v_existing.observed_at is distinct from v_observed_at then
      raise exception 'SFI_SYSTEM_AI_RELATION_KEY_CONFLICT:%', v_relation_key;
    end if;
    return jsonb_build_object('relation',to_jsonb(v_existing),'mutated',false,'atomic',true);
  end if;

  insert into public.sfi_case_relations (
    relation_key, case_id, owner_id, tenant_id, relation_type, epistemic_role,
    from_ref, to_ref, source_refs, record_refs, evidence_refs, payload, observed_at
  ) values (
    v_relation_key, p_case_id, v_case.owner_id, v_case.tenant_id, v_relation_type, v_epistemic_role,
    v_from, v_to,
    coalesce(p_relation->'sourceRefs','[]'::jsonb),
    coalesce(p_relation->'recordRefs','[]'::jsonb),
    coalesce(p_relation->'evidenceRefs','[]'::jsonb),
    coalesce(p_relation->'payload','{}'::jsonb),
    v_observed_at
  ) returning * into v_relation_row;

  update public.sfi_cases set updated_at = now() where id = p_case_id;
  insert into public.sfi_case_audit_events (
    case_id, tenant_id, actor_id, action, after_state, context
  ) values (
    p_case_id,
    v_case.tenant_id,
    p_actor_id,
    'SYSTEM_AI_RELATION_RECORDED',
    jsonb_build_object(
      'relationId',v_relation_row.id,
      'relationKey',v_relation_row.relation_key,
      'relationType',v_relation_row.relation_type,
      'epistemicRole',v_relation_row.epistemic_role,
      'from',v_relation_row.from_ref,
      'to',v_relation_row.to_ref
    ),
    jsonb_build_object('contract','SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0','atomic',true)
  );

  return jsonb_build_object('relation',to_jsonb(v_relation_row),'mutated',true,'atomic',true);
end;
$$;

revoke all on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) from public;
revoke all on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) from anon;
revoke all on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) from authenticated;
grant execute on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) to service_role;
