alter table public.sfi_predictive_learning_events
  drop constraint if exists sfi_predictive_learning_events_learning_state_check;

alter table public.sfi_predictive_learning_events
  add constraint sfi_predictive_learning_events_learning_state_check
  check (learning_state in (
    'APPLIED',
    'REJECTED_LOW_QUALITY',
    'REJECTED_UNVERIFIABLE',
    'REVIEW_REQUIRED',
    'ROLLED_BACK',
    'ACCUMULATING_CALIBRATION_CORPUS',
    'CALIBRATION_CANDIDATE'
  ));

create or replace function public.guard_sfi_predictive_model_parameters()
returns trigger
language plpgsql
as $$
begin
  if (
    new.weights is distinct from old.weights
    or new.intercept is distinct from old.intercept
    or new.sample_count is distinct from old.sample_count
    or new.verified_sample_count is distinct from old.verified_sample_count
    or new.metrics is distinct from old.metrics
  ) and coalesce(current_setting('sfi.calibration_promotion', true), '') <> 'on' then
    raise exception 'SFI_MODEL_PARAMETER_UPDATE_REQUIRES_GOVERNED_PROMOTION';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_sfi_predictive_model_parameters on public.sfi_predictive_models;
create trigger guard_sfi_predictive_model_parameters
before update on public.sfi_predictive_models
for each row execute function public.guard_sfi_predictive_model_parameters();

create or replace function public.promote_sfi_predictive_model(
  p_model_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model public.sfi_predictive_models%rowtype;
  v_candidate public.sfi_predictive_learning_events%rowtype;
  v_total_closed integer;
  v_non_music_closed integer;
  v_new_id uuid;
  v_after jsonb;
begin
  select * into v_model
  from public.sfi_predictive_models
  where id = p_model_id
  for update;

  if not found then
    raise exception 'SFI_MODEL_NOT_FOUND';
  end if;

  select * into v_candidate
  from public.sfi_predictive_learning_events
  where model_id = p_model_id
    and learning_state = 'CALIBRATION_CANDIDATE'
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'SFI_CALIBRATION_CANDIDATE_NOT_FOUND';
  end if;

  select
    count(*),
    count(*) filter (where object_class <> 'music')
  into v_total_closed, v_non_music_closed
  from public.sfi_reference_cases
  where model_key = v_model.model_key
    and status = 'CLOSED'
    and outcome_id is not null;

  if v_total_closed < 30 then
    raise exception 'SFI_CALIBRATION_CORPUS_INSUFFICIENT:%/30', v_total_closed;
  end if;

  if v_non_music_closed < 1 then
    raise exception 'SFI_NON_MUSICAL_CASE_REQUIRED';
  end if;

  v_after := v_candidate.parameter_state_after;
  perform set_config('sfi.calibration_promotion', 'on', true);

  update public.sfi_predictive_models
  set status = 'FROZEN', updated_at = now()
  where id = p_model_id;

  insert into public.sfi_predictive_models (
    scope,
    model_key,
    target_key,
    target_kind,
    version,
    status,
    feature_schema,
    weights,
    intercept,
    learning_rate,
    sample_count,
    verified_sample_count,
    metrics,
    parent_model_id,
    created_by
  ) values (
    v_model.scope,
    v_model.model_key,
    v_model.target_key,
    v_model.target_kind,
    v_model.version + 1,
    'ACTIVE',
    v_model.feature_schema,
    coalesce(v_after->'weights', v_model.weights),
    coalesce((v_after->>'intercept')::numeric, v_model.intercept),
    v_model.learning_rate,
    coalesce((v_after->>'sampleCount')::integer, v_model.sample_count),
    coalesce((v_after->>'verifiedSampleCount')::integer, v_model.verified_sample_count),
    coalesce(v_after->'metrics', v_model.metrics),
    v_model.id,
    p_actor_id
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function public.promote_sfi_predictive_model(uuid, uuid) from public, anon, authenticated;
grant execute on function public.promote_sfi_predictive_model(uuid, uuid) to service_role;

comment on function public.promote_sfi_predictive_model(uuid, uuid) is
  'Promotes a calibration candidate only after 30 closed cases and at least one non-musical case. Parameter changes are versioned and ROOT-governed.';
