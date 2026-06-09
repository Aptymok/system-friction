export type ScoreFrictionSourceName =
  | 'youtube'
  | 'spotify'
  | 'genius'
  | 'google_trends'
  | 'soundcloud_public_v2'
  | 'tiktok_research_alternative'
  | 'manual_upload'
  | string;

export type ScoreFrictionObservationInput = {
  case_id?: string | null;
  source_name?: ScoreFrictionSourceName | null;
  source_url?: string | null;
  territory?: string | null;
  analysis_mode?: string | null;
  focus_variables?: unknown[] | null;
  observation_goal?: string | null;
  evidence_type?: string | null;
  reliability_score?: number | null;
  provenance_notes?: string | null;
  source_coverage_contribution?: number | null;
  raw_payload?: Record<string, unknown> | null;
  vector_overrides?: {
    acoustic_vector?: Record<string, unknown>;
    semantic_vector?: Record<string, unknown>;
    memetic_vector?: Record<string, unknown>;
    platform_vector?: Record<string, unknown>;
    mihm_cultural_vector?: Record<string, unknown>;
  } | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  soundcloudUrl?: string | null;
  tiktokUrl?: string | null;
  lyrics?: string | null;
  comments?: unknown[] | null;
  audioMetadata?: Record<string, unknown> | null;
  caseStudy?: string | null;
};

export type ScoreFrictionNormalizedObservation = {
  title: string | null;
  artist: string | null;
  sourceName: string;
  sourceUrl: string | null;
  territory: string;
  caseId: string | null;
  lyrics: string | null;
  comments: Array<{ body: string; timestamp?: number | string | null }>;
  metrics: Record<string, number>;
  tags: string[];
  metadata: Record<string, unknown>;
  collectedAt: string;
};

export type ScoreFrictionVectors = {
  acoustic_vector: Record<string, unknown>;
  semantic_vector: Record<string, unknown>;
  memetic_vector: Record<string, unknown>;
  platform_vector: Record<string, unknown>;
  mihm_cultural_vector: Record<string, unknown>;
};

export type ScoreFrictionCaseStudy = {
  case_id: string;
  name: string;
  phenomenon: string;
  friction: string;
  hypothesis: string;
  sources: string[];
  variables: string[];
  expectedPrototype: string;
  verificationMetric: string;
  status: string;
};
