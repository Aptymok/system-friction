-- DT-TRUTH-001, SecciÃ³n 15: Capa B (Verification Layer).
-- Tabla hija de sfi_prediction_entries â€” no la duplica, la vuelve auditable.
-- Una fila por ventana de retorno (72h/7d/30d/90d), con fuente jerarquizada y
-- regla declarada antes del cierre (R19).

create table if not exists public.sfi_prediction_verifications (
  id uuid primary key default gen_random_uuid(),
  prediction_entry_id uuid not null references public.sfi_prediction_entries(id) on delete cascade,
  hypothesis_id text not null,
  return_window text not null check (return_window in ('72h', '7d', '30d', '90d')),
  verification_state text not null default 'OPEN'
    check (verification_state in ('OPEN', 'DUE', 'OVERDUE', 'CLOSED', 'DISPUTED', 'SUPERSEDED')),
  evaluation_result text not null default 'NOT_EVALUATED'
    check (evaluation_result in ('TRUE', 'FALSE', 'PARTIAL', 'UNVERIFIABLE', 'NOT_EVALUATED')),
  verification_rule jsonb not null,
  ground_truth_source_type text not null,
  ground_truth_source_url text,
  ground_truth_source_query text,
  source_quality_tier integer not null check (source_quality_tier between 0 and 4),
  source_snapshot_hash text,
  source_checked_at timestamptz,
  source_value jsonb,
  evaluation_confidence numeric check (evaluation_confidence >= 0 and evaluation_confidence <= 1),
  evidence_state_after_verification text
    check (evidence_state_after_verification in ('PENDING', 'OBSERVED', 'VERIFIED', 'DEGRADED', 'UNCERTAIN', 'ARCHIVED')),
  verification_notes text,
  verified_by text,
  superseded_by uuid references public.sfi_prediction_verifications(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sfi_prediction_verifications_active_window_idx
  on public.sfi_prediction_verifications (prediction_entry_id, return_window)
  where verification_state <> 'SUPERSEDED';

create index if not exists sfi_prediction_verifications_hypothesis_idx
  on public.sfi_prediction_verifications (hypothesis_id);

create index if not exists sfi_prediction_verifications_state_idx
  on public.sfi_prediction_verifications (verification_state);

create index if not exists sfi_prediction_verifications_result_idx
  on public.sfi_prediction_verifications (evaluation_result);

create or replace function public.set_sfi_prediction_verifications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sfi_prediction_verifications_updated_at
on public.sfi_prediction_verifications;

create trigger set_sfi_prediction_verifications_updated_at
before update on public.sfi_prediction_verifications
for each row
execute function public.set_sfi_prediction_verifications_updated_at();

alter table public.sfi_prediction_verifications enable row level security;

drop policy if exists "sfi prediction verifications service role full access"
on public.sfi_prediction_verifications;

create policy "sfi prediction verifications service role full access"
on public.sfi_prediction_verifications
for all
to service_role
using (true)
with check (true);

-- Sin acceso pÃºblico todavÃ­a. Fase 5 debe exponer solo una vista sanitizada.
revoke all on public.sfi_prediction_verifications from anon, authenticated;
grant all on public.sfi_prediction_verifications to service_role;