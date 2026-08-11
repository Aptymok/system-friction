-- SFI governance schema repair
-- Repairs production/runtime drift detected by ROOT readiness.
-- This migration changes schema/legacy lifecycle labels only; it does not create evidence,
-- decisions, approvals or scientific claims.

alter table if exists public.sfi_cognitive_twin_decisions
  add column if not exists decision_kind text;

comment on column public.sfi_cognitive_twin_decisions.decision_kind is
  'Optional governed classification of a founder/institutional decision. NULL means unclassified; it does not invalidate the decision record.';

-- Normalize the one historical lifecycle spelling that the current runtime already
-- interprets read-only as design_approved. This removes permanent health warnings
-- without inventing a new governance decision.
update public.action_proposals
set status = 'design_approved'
where lower(coalesce(status, '')) = 'approved';

create index if not exists idx_sfi_ct_decisions_kind
  on public.sfi_cognitive_twin_decisions(decision_kind, created_at desc);
