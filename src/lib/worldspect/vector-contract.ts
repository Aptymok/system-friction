export const WORLDSPECT_DOMAINS = [
  'CULTURAL',
  'ECONOMY',
  'GEO_DIGITAL',
  'GEOPOLITICAL',
  'BIO',
  'CLIMATE',
  'INSTITUTIONAL',
  'MEMETIC',
  'TECH',
  'AFFECTIVE',
] as const;

export type WorldSpectDomain = typeof WORLDSPECT_DOMAINS[number];

export type WorldSpectVector = {
  domain: WorldSpectDomain;
  value: number;
  velocity: number;
  volatility: number;
  persistence: number;
  source_count: number;
  trust: number;
  degradation: number;
  observed_at: string;
  status?: 'ACTIVE' | 'BOOTSTRAPPED' | 'DEGRADED_BLOCKING';
  sources?: string[];
};

export type WorldSpectVectorSnapshot = {
  id: string;
  observed_at: string;
  vectors: WorldSpectVector[];
  wsi: number;
  nti: number;
  regime: 'LOW' | 'TENSION' | 'CRITICAL';
  status?: 'ACTIVE' | 'BOOTSTRAPPED' | 'DEGRADED_BLOCKING';
  sourceCoverage?: number;
  degradedSources?: string[];
};

export type EvidenceLevel = 'world_external' | 'sfi_internal' | 'user_internal' | 'case_internal';

export type VectorTraceState =
  | 'world_observed'
  | 'institutionally_supported'
  | 'user_not_calibrated'
  | 'user_calibrated'
  | 'trace_incomplete'
  | 'unobserved';

export type EvidenceTrace = {
  id: string;
  level: EvidenceLevel;
  vector: WorldSpectDomain;
  source_id: string;
  provider: string;
  observed_at: string;
  value: number | null;
  weight: number | null;
  trust: number | null;
  evidence_ref: string;
  summary: string;
  payload: unknown;
};

export type VectorEvidenceTrace = {
  vector: WorldSpectDomain;
  value: number | null;
  trust: number | null;
  persistence: number | null;
  degradation: number | null;
  world_external_evidence: EvidenceTrace[];
  sfi_internal_evidence: EvidenceTrace[];
  user_internal_evidence: EvidenceTrace[];
  case_internal_evidence: EvidenceTrace[];
  state: VectorTraceState;
  can_claim_world_reading: boolean;
  can_claim_sfi_reading: boolean;
  can_claim_user_reading: boolean;
  missing: {
    world_external: boolean;
    sfi_internal: boolean;
    user_internal: boolean;
    case_internal: boolean;
  };
  explanation: string;
};

export type WorldAttractor = {
  id: string;
  label: string;
  vectors: WorldSpectDomain[];
  confidence: number;
  persistence: number;
  degradation: number;
  duration_snapshots: number;
  direction: 'forming' | 'strengthening' | 'weakening' | 'fragmenting' | 'unknown';
  evidence_basis: string[];
  explanation: string;
};

export type WorldOpportunity = {
  id: string;
  vector: WorldSpectDomain;
  attractor_id?: string | null;
  title: string;
  score: number;
  window: string;
  basis: {
    persistence_delta: number;
    degradation_delta: number;
    trust: number;
    source_count: number;
    evidence_refs: string[];
  };
  risk: 'low' | 'medium' | 'high';
  recommended_next_step: string;
  verification_condition: string;
  explanation: string;
};

export type WorldSpectLensDomain = WorldSpectDomain | 'TOTAL';

export type WorldSpectSupportLevel =
  | 'native'
  | 'derived'
  | 'fallback'
  | 'unsupported'
  | 'unknown';

export function normalizeWorldSpectLensDomain(
  value: unknown,
  fallback: WorldSpectDomain = 'CULTURAL'
): WorldSpectDomain {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (WORLDSPECT_DOMAINS as readonly string[]).includes(normalized)
    ? (normalized as WorldSpectDomain)
    : fallback;
}


