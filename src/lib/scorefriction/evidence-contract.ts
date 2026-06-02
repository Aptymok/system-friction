export type ScoreFrictionEvidenceType =
  | 'lyrics'
  | 'hook'
  | 'comment_sample'
  | 'trend_snapshot'
  | 'chart_snapshot'
  | 'platform_export'
  | 'dataset_sample'
  | 'producer_log'
  | 'listening_panel'
  | 'community_observation'
  | 'distribution_report'
  | 'audio_metadata'
  | 'audio_file_analysis';

export type ScoreFrictionEvidenceInput = {
  case_id: string;
  source_name: string;
  source_url?: string | null;
  territory?: string;
  evidence_type: ScoreFrictionEvidenceType;
  reliability_score?: number;
  provenance_notes?: string | null;
  raw_payload: Record<string, unknown>;
};

export type ScoreFrictionEvidenceResult = {
  ok: boolean;
  observation_id?: string;
  evidence_hash?: string;
  vector_summary?: Record<string, unknown>;
  error?: string;
  details?: string;
};

export const SCORE_FRICTION_EVIDENCE_TYPES: ScoreFrictionEvidenceType[] = [
  'lyrics',
  'hook',
  'comment_sample',
  'trend_snapshot',
  'chart_snapshot',
  'platform_export',
  'dataset_sample',
  'producer_log',
  'listening_panel',
  'community_observation',
  'distribution_report',
  'audio_metadata',
  'audio_file_analysis',
];

export function isScoreFrictionEvidenceType(value: unknown): value is ScoreFrictionEvidenceType {
  return typeof value === 'string' && SCORE_FRICTION_EVIDENCE_TYPES.includes(value as ScoreFrictionEvidenceType);
}
