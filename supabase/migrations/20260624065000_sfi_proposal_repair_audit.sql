create table if not exists sfi_proposal_repair_audit (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null,
  repair_draft jsonb not null default '{}',
  original_snapshot jsonb not null default '{}',
  evidence_requirements jsonb not null default '{}',
  applied boolean not null default false,
  applied_at timestamptz,
  created_at timestamptz default now(),
  created_by text default 'sfi_phase_5de',
  notes text
);

create index if not exists idx_sfi_proposal_repair_audit_proposal_id
  on sfi_proposal_repair_audit (proposal_id);

create index if not exists idx_sfi_proposal_repair_audit_created_at
  on sfi_proposal_repair_audit (created_at desc);

grant select, insert on sfi_proposal_repair_audit to authenticated;
grant select, insert on sfi_proposal_repair_audit to service_role;

notify pgrst, 'reload schema';
