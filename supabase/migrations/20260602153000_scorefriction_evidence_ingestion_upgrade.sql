alter table public.scorefriction_observations
  add column if not exists evidence_type text,
  add column if not exists reliability_score numeric default 0.5,
  add column if not exists provenance_notes text,
  add column if not exists source_coverage_contribution numeric default 0.05;

create index if not exists scorefriction_observations_evidence_type_idx
on public.scorefriction_observations (evidence_type);

create index if not exists scorefriction_observations_case_type_created_idx
on public.scorefriction_observations (case_id, evidence_type, created_at desc);

insert into scorefriction_sources (source_name, source_type, access_mode, reliability_score, rate_limit_notes, legal_notes)
values
  ('yt30m_dataset', 'dataset_sample', 'operator_upload', 0.62, 'Upload excerpts only.', 'Dataset evidence is directional, not ground truth.'),
  ('ytcommentverse_dataset', 'comment_dataset', 'operator_upload', 0.62, 'Upload excerpts only.', 'Do not include private user data.'),
  ('youtube_trending_dataset', 'trend_dataset', 'operator_upload', 0.58, 'Upload snapshots only.', 'Treat as circulation signal.'),
  ('musicbrainz_dump', 'metadata_dump', 'operator_upload', 0.66, 'Upload small excerpts only.', 'Public metadata only.'),
  ('listenbrainz_dump', 'listening_dump', 'operator_upload', 0.61, 'Upload small excerpts only.', 'Do not expose private listener identity.'),
  ('lastfm_dataset', 'listening_dataset', 'operator_upload', 0.59, 'Upload small excerpts only.', 'Respect dataset license.'),
  ('kworb_snapshot', 'chart_snapshot', 'operator_snapshot', 0.57, 'Snapshot, no aggressive scraping.', 'Directional chart evidence.'),
  ('shazam_chart_snapshot', 'chart_snapshot', 'operator_snapshot', 0.6, 'Snapshot, no aggressive scraping.', 'Directional discovery evidence.'),
  ('musicsem_dataset', 'semantic_dataset', 'operator_upload', 0.64, 'Upload excerpts only.', 'Respect dataset license.'),
  ('distribution_report', 'distribution_report', 'operator_upload', 0.72, 'Use producer/distributor exports.', 'Report-level evidence, not private user identity.'),
  ('producer_log', 'producer_log', 'operator_upload', 0.68, 'Operator-supplied log.', 'Treat as subjective provenance.'),
  ('listening_panel', 'listening_panel', 'operator_upload', 0.7, 'Panel snapshots only.', 'Panel evidence must carry context notes.')
on conflict (source_name) do update set
  source_type = excluded.source_type,
  access_mode = excluded.access_mode,
  reliability_score = excluded.reliability_score,
  rate_limit_notes = excluded.rate_limit_notes,
  legal_notes = excluded.legal_notes;
