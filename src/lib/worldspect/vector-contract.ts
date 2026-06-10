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
