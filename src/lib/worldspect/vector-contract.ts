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


