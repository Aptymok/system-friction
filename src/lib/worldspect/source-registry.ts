import type { SourceAccessKind, WorldSpectDomain } from './source-adapter-contract'

export type WorldSpectSourceDefinition = {
  sourceId: string
  label: string
  domain: WorldSpectDomain
  accessKind: SourceAccessKind
  adapter: string
  requiredEnv: string[]
  cadence: '15m' | '1h' | '6h' | 'daily' | 'manual'
  requiredForProduction: boolean
  signals: string[]
  notes: string
}

const source = (
  sourceId: string,
  label: string,
  domain: WorldSpectDomain,
  adapter: string,
  accessKind: SourceAccessKind,
  requiredEnv: string[],
  requiredForProduction: boolean,
  signals: string[],
  notes: string,
  cadence: WorldSpectSourceDefinition['cadence'] = '1h',
): WorldSpectSourceDefinition => ({ sourceId, label, domain, adapter, accessKind, requiredEnv, cadence, requiredForProduction, signals, notes })

export const WORLDSPECT_SOURCE_REGISTRY: WorldSpectSourceDefinition[] = [
  source('gdelt_doc_culture', 'GDELT DOC / Culture Themes', 'CULTURAL', 'gdelt', 'public-api', [], true, ['attention', 'recurrence', 'affect', 'novelty'], 'Global news themes, tone and article volume.'),
  source('youtube_culture_search', 'YouTube Data API / Culture Search', 'CULTURAL', 'youtube', 'public-api', ['YOUTUBE_API_KEY'], true, ['attention', 'velocity', 'recurrence'], 'Public metadata only.'),
  source('user_uploaded_audio_culture', 'User Uploaded Audio / Lyrics / JSON', 'CULTURAL', 'manual', 'internal-evidence', [], true, ['affect', 'novelty', 'semanticDensity'], 'Operator-provided evidence only.', 'manual'),
  source('fred_macro', 'FRED / Macro Series', 'ECONOMY', 'fred', 'public-api', ['FRED_API_KEY'], true, ['economicStress', 'velocity'], 'Macro series metadata.', 'daily'),
  source('bls_labor_prices', 'BLS / Labor and Prices', 'ECONOMY', 'bls', 'public-api', [], true, ['economicStress', 'pricePressure'], 'BLS public API.', 'daily'),
  source('manual_economy', 'Manual Economy Evidence', 'ECONOMY', 'manual', 'manual-upload', [], false, ['economicStress'], 'Manual CSV/JSON evidence.', 'manual'),
  source('gdelt_geo_digital', 'GDELT / Geo-digital Signals', 'GEO_DIGITAL', 'gdelt', 'public-api', [], true, ['attention', 'recurrence'], 'Online news metadata.'),
  source('github_geo_digital', 'GitHub / Network Technical Signals', 'GEO_DIGITAL', 'github', 'public-api', ['GITHUB_TOKEN'], false, ['techStress'], 'Public repo metadata.'),
  source('manual_geo_digital', 'Manual Geo-digital Evidence', 'GEO_DIGITAL', 'manual', 'manual-upload', [], false, ['geoStress'], 'Operator evidence.', 'manual'),
  source('gdelt_events_geopolitical', 'GDELT Events / Geopolitical', 'GEOPOLITICAL', 'gdelt', 'public-api', [], true, ['geoStress', 'velocity'], 'GDELT event streams.', '15m'),
  source('gdelt_geo_mentions', 'GDELT GEO / Location Mentions', 'GEOPOLITICAL', 'gdelt', 'public-api', [], true, ['geoStress', 'recurrence'], 'Location recurrence.'),
  source('manual_geopolitical', 'Manual Geopolitical Evidence', 'GEOPOLITICAL', 'manual', 'manual-upload', [], false, ['geoStress'], 'Licensed/exported datasets.', 'manual'),
  source('gdelt_health_themes', 'GDELT Health Themes', 'BIO', 'gdelt', 'public-api', [], true, ['bioStress', 'attention'], 'Health themes.'),
  source('openaq_air_quality_bio', 'OpenAQ / Air Quality', 'BIO', 'openaq', 'public-api', ['OPENAQ_API_KEY'], false, ['bioStress'], 'Air quality pressure.'),
  source('manual_bio_public_health', 'Manual Public Health Evidence', 'BIO', 'manual', 'manual-upload', [], false, ['bioStress'], 'WHO/OWID/CDC exports.', 'manual'),
  source('noaa_cdo_climate', 'NOAA CDO / Climate Data', 'CLIMATE', 'noaa', 'public-api', ['NOAA_CDO_TOKEN'], true, ['climateStress'], 'NOAA observations.', 'daily'),
  source('nasa_eonet_events', 'NASA EONET / Natural Events', 'CLIMATE', 'eonet', 'public-api', [], true, ['climateStress', 'velocity'], 'Natural event categories.'),
  source('openaq_air_quality_climate', 'OpenAQ / Climate-Air Quality Proxy', 'CLIMATE', 'openaq', 'public-api', ['OPENAQ_API_KEY'], false, ['climateStress'], 'Air proxy.'),
  source('gdelt_institutional_mentions', 'GDELT / Institutional Mentions', 'INSTITUTIONAL', 'gdelt', 'public-api', [], true, ['institutionalStress'], 'Institutional themes.'),
  source('official_feeds_institutional', 'Official Feeds', 'INSTITUTIONAL', 'manual', 'official-feed', [], false, ['institutionalStress'], 'Configured official feeds.', 'daily'),
  source('internal_evidence_institutional', 'Internal Evidence Docs', 'INSTITUTIONAL', 'manual', 'internal-evidence', [], true, ['institutionalStress'], 'Uploaded internal evidence.', 'manual'),
  source('youtube_memetic', 'YouTube / Memetic Signals', 'MEMETIC', 'youtube', 'public-api', ['YOUTUBE_API_KEY'], true, ['memeticPressure'], 'Public metadata only.', '6h'),
  source('reddit_memetic', 'Reddit / Memetic Threads', 'MEMETIC', 'reddit', 'oauth', ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'], true, ['memeticPressure'], 'OAuth public metadata.'),
  source('gdelt_ngrams_memetic', 'GDELT / Ngrams', 'MEMETIC', 'gdelt', 'public-api', [], true, ['recurrence'], 'Ngram recurrence.', 'daily'),
  source('github_tech', 'GitHub / Technical Momentum', 'TECH', 'github', 'public-api', ['GITHUB_TOKEN'], true, ['techStress', 'novelty'], 'Public repo metadata.'),
  source('hackernews_tech_trends', 'Hacker News / Technical Discourse', 'TECH', 'hackernews', 'public-api', [], true, ['techStress'], 'HN metadata.'),
  source('gdelt_tech_themes', 'GDELT / Technology Themes', 'TECH', 'gdelt', 'public-api', [], true, ['techStress'], 'Global tech themes.'),
  source('gdelt_tone_affective', 'GDELT / Tone and Emotion', 'AFFECTIVE', 'gdelt', 'public-api', [], true, ['affect'], 'Tone/emotional scoring.'),
  source('reddit_affective', 'Reddit / Affective Discourse', 'AFFECTIVE', 'reddit', 'oauth', ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'], true, ['affect'], 'Approved public metadata.'),
  source('moph_affective_aggregate', 'MOP-H / Anonymous Aggregate', 'AFFECTIVE', 'manual', 'internal-evidence', [], false, ['affect', 'latency'], 'Aggregate anonymous metrics only.', 'manual'),
]
