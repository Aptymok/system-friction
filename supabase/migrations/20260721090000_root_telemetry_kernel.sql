-- ROOT Runtime Telemetry Layer (aditivo, no destructivo)
--
-- No modifica ninguna tabla existente. Es la base para que ROOT sepa
-- "quién está pensando" (root_agents) y "qué observó, cuándo, con qué
-- confianza" (root_observation_events) — en vez de que cada pantalla
-- calcule su propio estado en caliente sin dejar rastro.

create table if not exists public.root_agents (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null unique,
  name text not null,
  agent_type text not null check (agent_type in (
    'IDENTITY', 'HYPOTHESIS', 'GOVERNANCE', 'PREDICTION', 'STUDIO_TECHNICAL', 'CULTURAL', 'WORLD_VECTOR', 'COGNITIVE'
  )),
  capability text not null,
  status text not null default 'WAITING' check (status in (
    'ACTIVE', 'WAITING', 'SUPERVISED', 'MISSING_DATA', 'DISABLED'
  )),
  permissions text not null default 'READ_ONLY' check (permissions in (
    'READ_ONLY', 'PROPOSE_ONLY', 'SUPERVISED_EXECUTE'
  )),
  last_run_at timestamptz,
  last_observation_at timestamptz,
  last_confidence numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.root_observation_events (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null references public.root_agents(agent_key) on delete cascade,
  observed_at timestamptz not null default now(),
  phenomenon_id uuid references public.ppoi_phenomena(id) on delete set null,
  signal text not null,
  confidence numeric,
  linked jsonb not null default '[]'::jsonb,
  action text not null default 'none',
  created_at timestamptz not null default now()
);

create index if not exists root_observation_events_agent_idx on public.root_observation_events(agent_key, observed_at desc);
create index if not exists root_observation_events_phenomenon_idx on public.root_observation_events(phenomenon_id, observed_at desc);
create index if not exists root_observation_events_observed_idx on public.root_observation_events(observed_at desc);

alter table public.root_agents enable row level security;
alter table public.root_observation_events enable row level security;

-- ROOT es de un único operador soberano (fundador) — igual que el resto
-- de las tablas root_* existentes, acceso restringido a rol autenticado
-- con función de servicio; sin RLS por owner_id porque no es multi-tenant.
drop policy if exists root_agents_service_all on public.root_agents;
create policy root_agents_service_all on public.root_agents for all to service_role using (true) with check (true);

drop policy if exists root_observation_events_service_all on public.root_observation_events;
create policy root_observation_events_service_all on public.root_observation_events for all to service_role using (true) with check (true);
