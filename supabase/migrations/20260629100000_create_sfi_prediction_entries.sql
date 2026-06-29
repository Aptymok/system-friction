create extension if not exists pgcrypto;

create table if not exists public.sfi_prediction_entries (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  hypothesis_id text not null unique,
  case_label text,
  operator_mode text,
  fenotipo_estimado text not null,
  ep_estado_inicial text not null,
  ssp_esperada text not null,
  ssp_observada text,
  perturbacion_tipo text not null,
  perturbacion_aplicada text not null,
  prediccion_explicita text not null,
  probabilidad_estimativa numeric not null check (probabilidad_estimativa >= 0 and probabilidad_estimativa <= 1),
  friccion_respuesta_campo text,
  resultado_72h text,
  resultado_7d text,
  resultado_30d text,
  resultado_90d text,
  ep_t_registrada text,
  cp_dias integer,
  fallo_hipotesis text,
  refinamiento text,
  estado_observacion text not null default 'pendiente'
    check (estado_observacion in (
      'pendiente',
      'registrada_pre_perturbacion',
      'retrospective_observation',
      'observed',
      'verified',
      'degraded',
      'uncertain',
      'archived'
    )),
  prediction_registered_at timestamptz not null default now(),
  perturbation_applied_at timestamptz,
  is_predictive_evidence boolean not null default false,
  evidence_state text not null default 'PENDING'
    check (evidence_state in ('PENDING', 'OBSERVED', 'VERIFIED', 'DEGRADED', 'UNCERTAIN', 'ARCHIVED')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sfi_prediction_entries_case_id_idx
  on public.sfi_prediction_entries (case_id);

create index if not exists sfi_prediction_entries_created_at_idx
  on public.sfi_prediction_entries (created_at desc);

create index if not exists sfi_prediction_entries_evidence_state_idx
  on public.sfi_prediction_entries (evidence_state);

create index if not exists sfi_prediction_entries_observation_state_idx
  on public.sfi_prediction_entries (estado_observacion);

create index if not exists sfi_prediction_entries_predictive_idx
  on public.sfi_prediction_entries (is_predictive_evidence);

create or replace function public.set_sfi_prediction_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sfi_prediction_entries_updated_at
on public.sfi_prediction_entries;

create trigger set_sfi_prediction_entries_updated_at
before update on public.sfi_prediction_entries
for each row
execute function public.set_sfi_prediction_entries_updated_at();

alter table public.sfi_prediction_entries enable row level security;

drop policy if exists "sfi prediction entries service role full access"
on public.sfi_prediction_entries;

create policy "sfi prediction entries service role full access"
on public.sfi_prediction_entries
for all
to service_role
using (true)
with check (true);

revoke all on public.sfi_prediction_entries from anon, authenticated;
grant all on public.sfi_prediction_entries to service_role;
