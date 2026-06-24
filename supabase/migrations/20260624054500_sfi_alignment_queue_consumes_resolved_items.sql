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
where ap.status in ('draft', 'proposed', 'approved', 'design_approved', 'queued')
  and (
    la.proposal_id is null
    or la.recommended_status in ('align', 'keep_observing')
  );

grant select on public.vw_sfi_attractor_alignment_queue to anon, authenticated, service_role;

notify pgrst, 'reload schema';
