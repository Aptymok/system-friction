-- SFI System / AI Assurance intake guards V1
-- Harden the atomic package boundary without changing its persistence semantics.

alter function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb)
  rename to sfi_record_system_ai_intake_package_core_v1;

-- The implementation core is deliberately not callable by API/service clients.
revoke all on function public.sfi_record_system_ai_intake_package_core_v1(uuid,uuid,jsonb,jsonb) from public;
revoke all on function public.sfi_record_system_ai_intake_package_core_v1(uuid,uuid,jsonb,jsonb) from anon;
revoke all on function public.sfi_record_system_ai_intake_package_core_v1(uuid,uuid,jsonb,jsonb) from authenticated;
revoke all on function public.sfi_record_system_ai_intake_package_core_v1(uuid,uuid,jsonb,jsonb) from service_role;

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
  v_entity_type text;
  v_started_at timestamptz;
  v_finished_at timestamptz;
begin
  if p_object is null or jsonb_typeof(p_object) <> 'object' then
    raise exception 'SFI_SYSTEM_AI_ATOMIC_OBJECT_INVALID';
  end if;
  if p_relations is null or jsonb_typeof(p_relations) <> 'array' then
    raise exception 'SFI_SYSTEM_AI_ATOMIC_RELATIONS_INVALID';
  end if;

  -- A package is a set of semantic relations. Duplicate relation keys are ambiguous
  -- even when their endpoints differ by revision, so fail before any write occurs.
  if exists (
    select 1
    from (
      select value->>'relationKey' as relation_key, count(*) as occurrences
      from jsonb_array_elements(p_relations)
      group by value->>'relationKey'
      having count(*) > 1
    ) duplicates
  ) then
    raise exception 'SFI_SYSTEM_AI_DUPLICATE_RELATION_KEY_IN_PACKAGE';
  end if;

  -- Assurance intake records immutable completed execution traces. In-progress
  -- runtime state belongs to the source system and may be ingested once finished.
  v_entity_type := coalesce(p_object#>>'{payload,entityType}','');
  if v_entity_type = 'AI_EXECUTION' then
    if coalesce(p_object#>>'{payload,finishedAt}','') = '' then
      raise exception 'SFI_AI_EXECUTION_COMPLETION_REQUIRED';
    end if;
    v_started_at := nullif(p_object#>>'{payload,startedAt}','')::timestamptz;
    v_finished_at := nullif(p_object#>>'{payload,finishedAt}','')::timestamptz;
    if v_started_at is null or v_finished_at is null then
      raise exception 'SFI_AI_EXECUTION_INTERVAL_REQUIRED';
    end if;
    if v_finished_at < v_started_at then
      raise exception 'SFI_AI_EXECUTION_FINISHED_BEFORE_STARTED';
    end if;
  end if;

  return public.sfi_record_system_ai_intake_package_core_v1(
    p_case_id,
    p_actor_id,
    p_object,
    p_relations
  );
end;
$$;

revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from public;
revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from anon;
revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from authenticated;
grant execute on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) to service_role;
