-- SFI institutional attractor trajectory
-- The founder declaration below is a declared institutional direction, not an observed claim of attainment.

create table if not exists public.sfi_attractor_evidence_links (
  id uuid primary key default gen_random_uuid(),
  attractor_key text not null,
  evidence_source text not null,
  evidence_id text not null,
  dimension text not null,
  relation_type text not null check (relation_type in ('supports','contradicts','contextualizes','records')),
  strength numeric not null default 0 check (strength >= 0 and strength <= 1),
  epistemic_class text not null default 'derived',
  note text,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(attractor_key, evidence_source, evidence_id, dimension, relation_type)
);

create table if not exists public.sfi_attractor_trajectory_snapshots (
  id uuid primary key default gen_random_uuid(),
  attractor_key text not null,
  observed_at timestamptz not null default now(),
  evidence_coverage numeric not null default 0 check (evidence_coverage >= 0 and evidence_coverage <= 1),
  supported_dimensions text[] not null default '{}',
  missing_dimensions text[] not null default '{}',
  contradicted_dimensions text[] not null default '{}',
  dimension_state jsonb not null default '{}'::jsonb,
  evidence_refs text[] not null default '{}',
  source_state text not null default 'derived',
  created_at timestamptz not null default now()
);

create index if not exists sfi_attractor_evidence_key_idx on public.sfi_attractor_evidence_links(attractor_key, created_at desc);
create index if not exists sfi_attractor_trajectory_key_idx on public.sfi_attractor_trajectory_snapshots(attractor_key, observed_at desc);

create table if not exists public.sfi_phenomenon_trajectory_snapshots (
  id uuid primary key default gen_random_uuid(),
  phenomenon_key text not null,
  attractor_key text,
  attractor_relation text not null default 'unresolved' check (attractor_relation in ('supports','contradicts','contextualizes','unresolved')),
  observed_at timestamptz not null default now(),
  regime text not null,
  density numeric not null default 0,
  persistence numeric not null default 0,
  velocity numeric not null default 0,
  trust numeric not null default 0,
  degradation numeric not null default 0,
  evidence_count integer not null default 0,
  evidence_refs text[] not null default '{}',
  vector jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sfi_phenomenon_trajectory_key_idx on public.sfi_phenomenon_trajectory_snapshots(phenomenon_key, observed_at desc);
create index if not exists sfi_phenomenon_trajectory_attractor_idx on public.sfi_phenomenon_trajectory_snapshots(attractor_key, observed_at desc);

alter table public.sfi_attractor_evidence_links enable row level security;
alter table public.sfi_attractor_trajectory_snapshots enable row level security;
alter table public.sfi_phenomenon_trajectory_snapshots enable row level security;

drop policy if exists sfi_attractor_evidence_authenticated_read on public.sfi_attractor_evidence_links;
create policy sfi_attractor_evidence_authenticated_read on public.sfi_attractor_evidence_links for select to authenticated using (true);
drop policy if exists sfi_attractor_trajectory_authenticated_read on public.sfi_attractor_trajectory_snapshots;
create policy sfi_attractor_trajectory_authenticated_read on public.sfi_attractor_trajectory_snapshots for select to authenticated using (true);
drop policy if exists sfi_phenomenon_trajectory_authenticated_read on public.sfi_phenomenon_trajectory_snapshots;
create policy sfi_phenomenon_trajectory_authenticated_read on public.sfi_phenomenon_trajectory_snapshots for select to authenticated using (true);

insert into public.sfi_graph_nodes (
  node_key, label, module, node_type, layer, description, metrics, evidence_count,
  private_evidence_count, density, weight, degradation, status, position, visual, updated_at
) values (
  'SFI-INSTITUTION',
  'System Friction Institute',
  'institution',
  'institution',
  0,
  'Institutional subject whose declared direction is evaluated against observed evidence; declaration is not evidence of attainment.',
  jsonb_build_object('epistemicClass','declared','authority','founder'),
  0, 0, 0, 0, 0, 'active', '{}'::jsonb,
  jsonb_build_object('symbol','SFI','role','institutional_subject'),
  now()
) on conflict (node_key) do update set
  label = excluded.label,
  description = excluded.description,
  metrics = coalesce(public.sfi_graph_nodes.metrics, '{}'::jsonb) || excluded.metrics,
  updated_at = now();

insert into public.sfi_attractors (
  attractor_key, label, module, owner_node_key, attractor_type, density, confidence,
  persistence, trust, degradation, weight, evidence_count, status, vector,
  first_seen, last_seen, updated_at
) values (
  'SFI-INSTITUTIONAL-ATTRACTOR-001',
  'Reorganización contextual persistente',
  'institution',
  'SFI-INSTITUTION',
  'declared_institutional',
  0,
  1,
  0,
  1,
  0,
  0,
  0,
  'declared',
  jsonb_build_object(
    'epistemicClass','declared',
    'authoritySource','founder',
    'declaredAt','2026-08-07T13:30:00Z',
    'desiredState','Que System Friction Institute alcance autoridad y reconocimiento internacional sobre la observación y reorganización de ecosistemas digitales, biológicos y ontológicos, sosteniendo investigación y actividad comercial persistentes mediante instrumentos de perturbación mínima y gobernanza.',
    'mechanism','Observar antes de inferir; contrastar evidencia; detectar trayectorias y atractores; proponer perturbaciones mínimas reversibles; gobernar acciones de mayor autoridad; registrar retornos y aprender sin imponer una solución única.',
    'normativePosition','SFI no presume neutralidad: declara dirección, límites, autoridad y criterios de evidencia, pero no sustituye la agencia del sistema observado.',
    'dimensions',jsonb_build_array(
      'research_persistence',
      'instrument_adoption',
      'commercial_persistence',
      'external_recognition',
      'domain_breadth',
      'minimal_perturbation_governance',
      'institutional_continuity'
    ),
    'claimBoundary','El reconocimiento, adopción, ventas y alcance internacional sólo se consideran observados cuando existe evidencia externa o transaccional persistida. La declaración del fundador constituye dirección, no logro.'
  ),
  now(), now(), now()
) on conflict (attractor_key) do update set
  label = excluded.label,
  module = excluded.module,
  owner_node_key = excluded.owner_node_key,
  attractor_type = excluded.attractor_type,
  confidence = excluded.confidence,
  trust = excluded.trust,
  status = excluded.status,
  vector = excluded.vector,
  last_seen = now(),
  updated_at = now();
