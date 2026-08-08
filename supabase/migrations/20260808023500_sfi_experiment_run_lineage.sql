-- Attach the declared institutional experiment state to every institutional cognitive run.
-- This does not infer autonomy; it preserves the operating constraint under which the run occurred.

create or replace function public.sfi_attach_institutional_experiment_to_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  exp jsonb;
begin
  if new.role is distinct from 'institutional_cycle' then
    return new;
  end if;

  select jsonb_build_object(
    'experimentKey', experiment_key,
    'status', status,
    'operatingMode', operating_mode,
    'startsAt', starts_at,
    'endsAt', ends_at,
    'observerRole', observer_role,
    'founderEscalationPolicy', founder_escalation_policy,
    'allowedAutonomousActions', allowed_autonomous_actions,
    'reservedFounderActions', reserved_founder_actions,
    'epistemicClass', epistemic_class,
    'claimBoundary', config->>'claimBoundary'
  ) into exp
  from public.sfi_institutional_experiments
  where experiment_key = 'SFI-INSTITUTIONAL-30D-001';

  if exp is not null then
    new.input_snapshot = coalesce(new.input_snapshot, '{}'::jsonb) || jsonb_build_object('institutionalExperiment', exp);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sfi_attach_institutional_experiment_to_run on public.sfi_cognitive_twin_runs;
create trigger trg_sfi_attach_institutional_experiment_to_run
before insert on public.sfi_cognitive_twin_runs
for each row execute function public.sfi_attach_institutional_experiment_to_run();
