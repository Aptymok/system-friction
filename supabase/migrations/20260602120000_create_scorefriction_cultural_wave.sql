create table if not exists scorefriction_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null unique,
  source_type text not null,
  access_mode text not null,
  reliability_score numeric default 0.5,
  rate_limit_notes text,
  legal_notes text,
  created_at timestamptz default now()
);

create table if not exists scorefriction_observations (
  id uuid primary key default gen_random_uuid(),
  case_id text,
  source_name text,
  source_url text,
  territory text default 'MX',
  raw_payload jsonb,
  normalized_payload jsonb,
  evidence_hash text,
  created_at timestamptz default now()
);

create table if not exists scorefriction_case_studies (
  case_id text primary key,
  name text not null,
  phenomenon text,
  friction text,
  hypothesis text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists scorefriction_vectors (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid references scorefriction_observations(id) on delete cascade,
  acoustic_vector jsonb,
  semantic_vector jsonb,
  memetic_vector jsonb,
  platform_vector jsonb,
  mihm_cultural_vector jsonb,
  created_at timestamptz default now()
);

create table if not exists scorefriction_prototypes (
  id uuid primary key default gen_random_uuid(),
  case_id text references scorefriction_case_studies(case_id),
  prototype_name text,
  prompt jsonb,
  lyrics text,
  production_brief jsonb,
  generated_artifact_url text,
  created_at timestamptz default now()
);

create table if not exists scorefriction_verifications (
  id uuid primary key default gen_random_uuid(),
  prototype_id uuid references scorefriction_prototypes(id) on delete cascade,
  platform text,
  metrics jsonb,
  interpretation jsonb,
  verified_at timestamptz default now()
);

insert into scorefriction_sources (source_name, source_type, access_mode, reliability_score, rate_limit_notes, legal_notes)
values
  ('youtube', 'platform', 'api_or_manual', 0.74, 'Use low-volume API access and cache public metrics.', 'Respect YouTube API terms and attribution requirements.'),
  ('spotify', 'platform', 'api_or_distributor_report', 0.68, 'Prefer official API or distributor reports.', 'Do not infer private listener identity.'),
  ('genius', 'lyrics', 'api_or_manual', 0.62, 'Use API where available; manual lyrics allowed.', 'Respect lyric licensing and quote limits.'),
  ('google_trends', 'trend_signal', 'public_tool_or_export', 0.58, 'Use exported trend snapshots for auditability.', 'Treat as directional, not demographic proof.'),
  ('soundcloud_public_v2', 'platform', 'public_low_volume', 0.57, 'Low volume, delayed, cached requests only.', 'No aggressive evasion, no residential proxy requirement.'),
  ('tiktok_research_alternative', 'platform', 'dataset_or_manual', 0.52, 'Accept external datasets, CSV, or manual captures.', 'Respect platform policy and mark uncertainty.'),
  ('manual_upload', 'manual_evidence', 'operator_supplied', 0.5, 'Operator must provide source notes.', 'Manual evidence must carry provenance notes.')
on conflict (source_name) do update set
  source_type = excluded.source_type,
  access_mode = excluded.access_mode,
  reliability_score = excluded.reliability_score,
  rate_limit_notes = excluded.rate_limit_notes,
  legal_notes = excluded.legal_notes;

insert into scorefriction_case_studies (case_id, name, phenomenon, friction, hypothesis, status)
values
  ('CW-001', 'Saturacion Reggaeton / Vacio de Construccion', 'Saturacion de formulas urbanas dominantes.', 'Alta repeticion con baja construccion narrativa.', 'Un prototipo con agencia narrativa clara puede producir senal diferencial.', 'active'),
  ('CW-002', 'Nostalgia Tecnologica / Futuro Personal', 'Recuerdo tecnologico como refugio cultural.', 'Nostalgia sin direccion futura.', 'La nostalgia puede convertirse en futuro personal verificable.', 'active'),
  ('CW-003', 'Fatiga Cognitiva / Musica de Baja Carga', 'Busqueda de baja carga mental.', 'Atencion agotada y baja tolerancia a densidad.', 'Una estructura simple con textura precisa puede sostener escucha repetida.', 'active'),
  ('CW-004', 'Microcomunidad / Coro de Pertenencia', 'Coro como senal de pertenencia local.', 'Comunidad dispersa sin gesto comun.', 'Un hook coral puede condensar pertenencia sin marketing pesado.', 'active'),
  ('CW-005', 'Ansiedad de Futuro / Epica Operativa', 'Futuro percibido como amenaza.', 'Energia alta sin direccion operacional.', 'Una epica sobria puede transformar ansiedad en accion verificable.', 'active'),
  ('CW-006', 'Lenguaje Meme / Sedimentacion Semantica', 'Memes como memoria cultural comprimida.', 'Alta velocidad con baja permanencia.', 'Un motivo repetible puede sedimentar significado sin explicar demasiado.', 'active'),
  ('CW-007', 'Territorio Local / Identidad Expandible', 'Identidad territorial que puede escalar.', 'Lo local queda encerrado o se diluye.', 'Una marca sonora local puede expandirse si conserva rasgo verificable.', 'active'),
  ('CW-008', 'Romance Post-Digital / Vinculo Sin Performance', 'Vinculo afectivo mediado por performance digital.', 'Exceso de pose y baja vulnerabilidad util.', 'Una voz menos performativa puede activar resonancia afectiva.', 'active'),
  ('CW-009', 'Escena SoundCloud / Emergencia No Institucionalizada', 'Escena periferica creativa fuera de canales formales.', 'Senal emergente sin lectura institucional.', 'SoundCloud puede revelar protoatractores antes del mainstream.', 'active'),
  ('CW-010', 'TikTok Gesture Loop / Ritualizacion de Audio Corto', 'Audio corto como gesto social repetido.', 'Fragmentabilidad alta con baja continuidad.', 'Un drop reutilizable puede generar ritualizacion si comprime sentido.', 'active')
on conflict (case_id) do update set
  name = excluded.name,
  phenomenon = excluded.phenomenon,
  friction = excluded.friction,
  hypothesis = excluded.hypothesis,
  status = excluded.status;
