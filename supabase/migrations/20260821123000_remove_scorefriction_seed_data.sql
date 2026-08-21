-- Retire development seed data from the live ScoreFriction substrate.
-- Historical migration files remain immutable; runtime state is cleaned here.

begin;

delete from public.scorefriction_case_studies
where case_id in ('CW-001','CW-002','CW-003','CW-004','CW-005','CW-006','CW-007','CW-008','CW-009','CW-010');

-- Source registry entries are configuration, not evidence. Their former numeric
-- reliability values were development priors and must not be presented as measured trust.
update public.scorefriction_sources
set reliability_score = null
where source_name in (
  'youtube','spotify','genius','google_trends','soundcloud_public_v2','tiktok_research_alternative','manual_upload',
  'yt30m_dataset','ytcommentverse_dataset','youtube_trending_dataset','musicbrainz_dump','listenbrainz_dump',
  'lastfm_dataset','kworb_snapshot','shazam_chart_snapshot','musicsem_dataset','distribution_report','producer_log','listening_panel'
);

commit;
