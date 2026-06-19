create extension if not exists pgcrypto;

create table if not exists public.sfi_declared_attractors (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  desired_future_state text not null,
  active boolean not null default true,
  priority numeric not null default 1,
  horizon text,
  success_markers jsonb not null default '[]'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sfi_proposal_alignment (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.action_proposals(id) on delete cascade,
  attractor_id uuid references public.sfi_declared_attractors(id) on delete set null,
  alignment_score numeric,
  evidence_score numeric,
  regime_fit_score numeric,
  execution_value_score numeric,
  recovery_cost_score numeric,
  risk_score numeric,
  recommended_status text,
  recommendation text,
  alternative_perturbation text,
  rationale text,
  override_reason text,
  expected_cost text,
  created_at timestamptz not null default now()
);

create index if not exists sfi_declared_attractors_active_idx
on public.sfi_declared_attractors (active, priority desc, created_at desc);

create index if not exists sfi_proposal_alignment_proposal_idx
on public.sfi_proposal_alignment (proposal_id, created_at desc);

create index if not exists sfi_proposal_alignment_attractor_idx
on public.sfi_proposal_alignment (attractor_id, created_at desc);

create or replace view public.vw_sfi_closed_loop_state as
with proposals as (
  select count(*)::numeric as proposals_approved
  from public.action_proposals
  where status in ('approved', 'design_approved', 'queued', 'accepted')
     or approved_at is not null
),
plans as (
  select count(*)::numeric as execution_plans_created
  from public.sfi_execution_ledger
),
executions as (
  select count(*)::numeric as executions_executed
  from public.sfi_execution_ledger
  where executed_at is not null
     or execution_status in ('executed', 'generated', 'pending', 'recorded')
),
outcomes as (
  select count(*)::numeric as outcomes_recorded
  from public.sfi_outcomes
)
select
  p.proposals_approved,
  pl.execution_plans_created,
  e.executions_executed,
  o.outcomes_recorded,
  case when p.proposals_approved = 0 then 0 else round(pl.execution_plans_created / p.proposals_approved, 4) end as proposal_to_execution_ratio,
  case when e.executions_executed = 0 then 0 else round(o.outcomes_recorded / e.executions_executed, 4) end as execution_to_outcome_ratio,
  case when p.proposals_approved = 0 then 0 else round(o.outcomes_recorded / p.proposals_approved, 4) end as closed_loop_ratio,
  case
    when p.proposals_approved = 0 then 'missing approved proposals'
    when pl.execution_plans_created < p.proposals_approved then 'proposal_to_execution'
    when o.outcomes_recorded < e.executions_executed then 'execution_to_outcome'
    else 'closed_loop_stable'
  end as current_bottleneck,
  case
    when p.proposals_approved = 0 then 'missing execution plan'
    when pl.execution_plans_created < p.proposals_approved then 'approved proposals require concrete execution ledger records'
    when o.outcomes_recorded < e.executions_executed then 'executions require outcome evidence and lesson capture'
    else 'closed loop has proposal, execution and outcome trace'
  end as interpretation
from proposals p
cross join plans pl
cross join executions e
cross join outcomes o;

create or replace view public.vw_sfi_attractor_alignment_queue as
with active_attractor as (
  select *
  from public.sfi_declared_attractors
  where active is true
  order by priority desc, created_at desc
  limit 1
),
latest_alignment as (
  select distinct on (proposal_id)
    *
  from public.sfi_proposal_alignment
  order by proposal_id, created_at desc
)
select
  ap.id as proposal_id,
  coalesce(ap.title, ap.objective, ap.description, 'not enough trace') as proposal_title,
  coalesce(ap.objective, ap.description, ap.expected_field_delta->>'objective', 'not enough trace') as proposal_objective,
  aa.title as active_attractor,
  aa.id as attractor_id,
  la.alignment_score,
  la.evidence_score,
  la.regime_fit_score,
  la.recovery_cost_score,
  coalesce(
    la.recommended_status,
    case
      when aa.id is null then 'request_attractor'
      when coalesce(ap.objective, ap.description, ap.expected_field_delta->>'objective') is null then 'request_evidence'
      else 'keep_observing'
    end
  ) as recommended_status,
  coalesce(
    la.recommendation,
    case
      when aa.id is null then 'Declare active attractor before recommending execution.'
      when coalesce(ap.objective, ap.description, ap.expected_field_delta->>'objective') is null then 'Request evidence because proposal objective is missing.'
      else 'Classify this proposal against the active attractor before execution.'
    end
  ) as recommendation,
  la.alternative_perturbation,
  coalesce(la.rationale, 'not enough trace') as rationale
from public.action_proposals ap
left join latest_alignment la on la.proposal_id = ap.id
left join active_attractor aa on true
where ap.status in ('draft', 'proposed', 'approved', 'design_approved', 'queued');

create or replace view public.vw_sfi_reality_console_state as
select
  now() as read_at,
  (select row_to_json(x) from (select * from public.vw_sfi_operational_cycle limit 1) x) as operational_cycle,
  (select row_to_json(x) from (select * from public.vw_sfi_stability limit 1) x) as stability,
  (select row_to_json(x) from (select * from public.vw_sfi_pipeline_loss limit 1) x) as pipeline_loss,
  (select row_to_json(x) from (select * from public.vw_sfi_closed_loop_state limit 1) x) as closed_loop,
  (select row_to_json(x) from (select * from public.sfi_declared_attractors where active is true order by priority desc, created_at desc limit 1) x) as active_attractor;

create or replace view public.vw_sfi_perturbation_history as
select
  p.id as perturbation_id,
  p.case_id,
  p.minimal_action,
  p.expected_effect,
  p.status as perturbation_status,
  l.id as execution_id,
  l.execution_status,
  l.verification_status,
  o.id as outcome_id,
  o.outcome_status,
  o.observed_effect,
  p.created_at
from public.sfi_field_perturbations p
left join public.sfi_execution_ledger l on l.perturbation_id = p.id
left join public.sfi_outcomes o on o.execution_id = l.id
order by p.created_at desc;

grant select, insert, update on public.sfi_declared_attractors to anon, authenticated, service_role;
grant select, insert, update on public.sfi_proposal_alignment to anon, authenticated, service_role;
grant select on public.vw_sfi_closed_loop_state to anon, authenticated, service_role;
grant select on public.vw_sfi_attractor_alignment_queue to anon, authenticated, service_role;
grant select on public.vw_sfi_reality_console_state to anon, authenticated, service_role;
grant select on public.vw_sfi_perturbation_history to anon, authenticated, service_role;
grant select on public.vw_sfi_operational_cycle to anon, authenticated, service_role;
grant select on public.vw_sfi_stability to anon, authenticated, service_role;
grant select on public.vw_sfi_pipeline_loss to anon, authenticated, service_role;
grant select on public.vw_sfi_execution_recovery_queue to anon, authenticated, service_role;
grant select on public.vw_worldspect_real to anon, authenticated, service_role;
grant select on public.vw_scorefriction_real to anon, authenticated, service_role;
grant select on public.vw_sfi_evidence_map to anon, authenticated, service_role;
