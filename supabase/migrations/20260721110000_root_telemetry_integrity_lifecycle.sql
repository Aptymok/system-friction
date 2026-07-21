-- ROOT Telemetry Integrity + Agent Lifecycle + Observation Trace (aditivo)
--
-- No se elimina ni renombra ninguna columna existente de
-- root_agents / root_observation_events (20260721090000). Solo se agrega.

-- 1) Clasificación honesta de entidad — no todo lo registrado en
--    root_agents es un "agente" con ciclo de vida propio.
alter table public.root_agents
  add column if not exists entity_kind text not null default 'service'
    check (entity_kind in ('agent', 'service', 'pipeline', 'resolver', 'observer'));

-- 2) Ciclo de vida real, más allá de ACTIVE/WAITING. `status` se conserva
--    para no romper el código que ya lo lee; `lifecycle_state` es el
--    modelo fino nuevo.
alter table public.root_agents
  add column if not exists lifecycle_state text not null default 'created'
    check (lifecycle_state in (
      'created', 'initialized', 'observing', 'idle', 'degraded', 'blocked_missing_data', 'retired'
    ));

-- 3) Observation Trace mínimo: qué evidencia se usó, qué patrón se
--    detectó, qué acción se propone, y quién autoriza el siguiente paso.
alter table public.root_observation_events
  add column if not exists evidence_used jsonb not null default '[]'::jsonb,
  add column if not exists pattern_detected text,
  add column if not exists proposed_action text,
  add column if not exists awaiting_authorization boolean not null default false,
  add column if not exists authorized_by text,
  add column if not exists authorized_at timestamptz;

-- 4) Incidentes de telemetría — para responder "¿hay eventos perdidos o
--    errores de escritura?" en vez de asumir que todo lo que se intentó
--    grabar se grabó.
create table if not exists public.root_telemetry_incidents (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('write_error', 'sync_gap')),
  agent_key text,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists root_telemetry_incidents_occurred_idx on public.root_telemetry_incidents(occurred_at desc);

alter table public.root_telemetry_incidents enable row level security;

drop policy if exists root_telemetry_incidents_service_all on public.root_telemetry_incidents;
create policy root_telemetry_incidents_service_all on public.root_telemetry_incidents for all to service_role using (true) with check (true);
