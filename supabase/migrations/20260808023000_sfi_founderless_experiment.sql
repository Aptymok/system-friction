-- SFI 30-day institutional autonomy experiment.
-- This table stores declared operating mode and governance boundaries only.
-- READY/ACTIVE are operational declarations, never evidence that autonomy was achieved.

create table if not exists public.sfi_institutional_experiments (
  experiment_key text primary key,
  label text not null,
  attractor_key text,
  status text not null check (status in ('READY','ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  operating_mode text not null check (operating_mode in ('FOUNDER_PRESENT','FOUNDER_ABSENT')),
  starts_at timestamptz,
  ends_at timestamptz,
  observer_role text not null default 'observer',
  founder_escalation_policy text not null,
  allowed_autonomous_actions text[] not null default '{}',
  reserved_founder_actions text[] not null default '{}',
  report_cadence text[] not null default '{}',
  epistemic_class text not null default 'DECLARED',
  config jsonb not null default '{}'::jsonb,
  activated_by uuid,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sfi_institutional_experiments enable row level security;

drop policy if exists sfi_institutional_experiments_authenticated_read on public.sfi_institutional_experiments;
create policy sfi_institutional_experiments_authenticated_read
  on public.sfi_institutional_experiments
  for select to authenticated using (true);

insert into public.sfi_institutional_experiments (
  experiment_key,
  label,
  attractor_key,
  status,
  operating_mode,
  starts_at,
  ends_at,
  observer_role,
  founder_escalation_policy,
  allowed_autonomous_actions,
  reserved_founder_actions,
  report_cadence,
  epistemic_class,
  config
) values (
  'SFI-INSTITUTIONAL-30D-001',
  'SFI · 30 días de continuidad institucional sin dependencia operativa del fundador',
  'SFI-INSTITUTIONAL-ATTRACTOR-001',
  'READY',
  'FOUNDER_ABSENT',
  '2026-08-07T00:00:00-06:00',
  '2026-09-06T23:59:59-06:00',
  'observer',
  'Escalar al fundador únicamente acciones reservadas, conflictos de autoridad, riesgos materiales o ausencia de evidencia suficiente para una decisión irreversible.',
  array['observe','integrate_evidence','derive','infer_with_provenance','simulate','propose','reconcile_ppoi','generate_reports'],
  array['canonical_promotion','governance_change','access_grant','spend','publication','irreversible_external_action','legal_commitment'],
  array['DAILY','WEEKLY','FINAL_30D'],
  'DECLARED',
  jsonb_build_object(
    'claimBoundary','FOUNDER_ABSENT describes the operating constraint of the experiment, not proof of institutional autonomy.',
    'observer','Edwin / institutional observer',
    'mopsInstrument','External observer develops and applies MOP-S during the experiment.',
    'attractorMustRemainActive',true
  )
) on conflict (experiment_key) do nothing;
