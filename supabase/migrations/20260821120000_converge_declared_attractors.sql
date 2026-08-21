-- Converge the former declared-attractor table into canonical sfi_attractors.
-- No parallel store remains after this migration.

begin;

insert into public.sfi_attractors (
  id,
  attractor_key,
  label,
  module,
  owner_node_key,
  attractor_type,
  density,
  confidence,
  persistence,
  trust,
  degradation,
  weight,
  evidence_count,
  status,
  vector,
  first_seen,
  last_seen,
  created_at,
  updated_at
)
select
  old.id,
  'SFI-DECLARED-' || old.id::text,
  old.title,
  'sfi',
  null,
  'declared_operational',
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  case when old.active then 'declared' else 'inactive' end,
  jsonb_build_object(
    'epistemicClass', 'DECLARED',
    'declarationScope', 'operational',
    'desiredFutureState', old.desired_future_state,
    'horizon', old.horizon,
    'successMarkers', old.success_markers,
    'constraints', old.constraints,
    'priority', old.priority,
    'declaredAt', old.created_at,
    'migratedFrom', 'sfi_declared_attractors',
    'measurementSemantics', 'Top-level numeric attractor fields remain zero until evidence-backed measurements exist; declaration is direction, not attainment.'
  ),
  old.created_at,
  old.updated_at,
  old.created_at,
  old.updated_at
from public.sfi_declared_attractors old
on conflict (id) do nothing;

drop view if exists public.vw_sfi_reality_console_state;
drop view if exists public.vw_sfi_attractor_alignment_queue;

alter table public.sfi_proposal_alignment
  drop constraint if exists sfi_proposal_alignment_attractor_id_fkey;

alter table public.sfi_proposal_alignment
  add constraint sfi_proposal_alignment_attractor_id_fkey
  foreign key (attractor_id)
  references public.sfi_attractors(id)
  on delete set null;

drop table if exists public.sfi_declared_attractors;

commit;
