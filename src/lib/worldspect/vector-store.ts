import { getLatestWorldSpectSnapshot } from './snapshotStore';
import { createBootstrappedWorldSpectSnapshot } from './bootstrap';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain, type WorldSpectVector, type WorldSpectVectorSnapshot } from './vector-contract';

type SourceLike = {
  key: string;
  label?: string;
  value: number | null;
  nti?: number;
  weight?: number;
  mihm_var?: string;
  simulated?: boolean;
  error?: string;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function numeric(value: unknown): number | null {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDomain(value: unknown): WorldSpectDomain | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (WORLDSPECT_DOMAINS as readonly string[]).includes(normalized)
    ? normalized as WorldSpectDomain
    : null;
}

function sourcePrefixDomain(source: SourceLike): WorldSpectDomain | null {
  const key = source.key.toLowerCase();
  if (key.startsWith('cultural_')) return 'CULTURAL';
  if (key.startsWith('economy_')) return 'ECONOMY';
  if (key.startsWith('geo_digital_')) return 'GEO_DIGITAL';
  if (key.startsWith('geopolitical_')) return 'GEOPOLITICAL';
  if (key.startsWith('bio_')) return 'BIO';
  if (key.startsWith('climate_')) return 'CLIMATE';
  if (key.startsWith('institutional_')) return 'INSTITUTIONAL';
  if (key.startsWith('memetic_')) return 'MEMETIC';
  if (key.startsWith('tech_')) return 'TECH';
  if (key.startsWith('affective_')) return 'AFFECTIVE';
  return null;
}

function domainForSource(source: SourceLike): WorldSpectDomain {
  const explicit = normalizeDomain(source.mihm_var);
  if (explicit) return explicit;

  const prefixed = sourcePrefixDomain(source);
  if (prefixed) return prefixed;

  const text = `${source.key} ${source.label ?? ''}`.toLowerCase();
  if (/music|culture|cultural|score|song|artist|media/.test(text)) return 'CULTURAL';
  if (/market|econom|price|inflation|finance|gdp/.test(text)) return 'ECONOMY';
  if (/geo.?digital|platform|network|search|social|traffic/.test(text)) return 'GEO_DIGITAL';
  if (/tech|ai|model|compute|software|code|github|hacker/.test(text)) return 'TECH';
  if (/war|policy|geopolit|state|border|election/.test(text)) return 'GEOPOLITICAL';
  if (/bio|health|medical|organism|species/.test(text)) return 'BIO';
  if (/climate|weather|carbon|temperature|water/.test(text)) return 'CLIMATE';
  if (/meme|trend|attention|viral|narrative/.test(text)) return 'MEMETIC';
  if (/affect|sentiment|emotion|mood|feeling/.test(text)) return 'AFFECTIVE';
  if (/institution|governance|law|regulat/.test(text)) return 'INSTITUTIONAL';
  return 'INSTITUTIONAL';
}

function aggregateDomain(domain: WorldSpectDomain, sources: SourceLike[], observedAt: string): WorldSpectVector {
  const domainSources = sources.filter((source) => domainForSource(source) === domain);
  const usable = domainSources.filter((source) => source.value !== null && source.simulated !== true && !source.error);
  const sourceCount = usable.length;

  if (sourceCount === 0) {
    return {
      domain,
      value: 0,
      velocity: 0,
      volatility: 0,
      persistence: 0,
      source_count: 0,
      trust: 0,
      degradation: 1,
      observed_at: observedAt,
      status: 'BOOTSTRAPPED',
      sources: [],
    };
  }

  const values = usable.map((source) => clamp01(numeric(source.value) ?? 0));
  const ntis = usable.map((source) => clamp01(numeric(source.nti) ?? numeric(source.weight) ?? numeric(source.value) ?? 0));
  const value = values.reduce((sum, item) => sum + item, 0) / sourceCount;
  const trust = ntis.reduce((sum, item) => sum + item, 0) / sourceCount;
  const volatility = values.reduce((sum, item) => sum + Math.abs(item - value), 0) / sourceCount;

  return {
    domain,
    value: Number(value.toFixed(4)),
    velocity: Number(volatility.toFixed(4)),
    volatility: Number(volatility.toFixed(4)),
    persistence: Number((trust * (1 - volatility)).toFixed(4)),
    source_count: sourceCount,
    trust: Number(trust.toFixed(4)),
    degradation: Number((1 - trust).toFixed(4)),
    observed_at: observedAt,
    status: 'ACTIVE',
    sources: usable.map((source) => source.key),
  };
}

export async function readWorldSpectVectorSnapshot(): Promise<{ ok: true; status: 'ACTIVE' | 'BOOTSTRAPPED'; snapshot: WorldSpectVectorSnapshot }> {
  const row = await getLatestWorldSpectSnapshot();
  if (!row) return { ok: true, status: 'BOOTSTRAPPED', snapshot: createBootstrappedWorldSpectSnapshot() };

  const sources = row.sources.map((source) => ({
    key: source.key,
    label: source.label,
    value: numeric(source.value),
    nti: numeric(source.nti) ?? undefined,
    weight: numeric(source.weight) ?? undefined,
    mihm_var: typeof source.mihm_var === 'string' ? source.mihm_var : undefined,
    simulated: source.simulated,
    error: source.error,
  }));

  const vectors = WORLDSPECT_DOMAINS.map((domain) => aggregateDomain(domain, sources, row.observed_at));
  const active = vectors.filter((vector) => vector.source_count > 0);

  if (active.length === 0 && row.wsi === null && row.nti === null) {
    return { ok: true, status: 'BOOTSTRAPPED', snapshot: createBootstrappedWorldSpectSnapshot() };
  }

  const wsi = clamp01(numeric(row.wsi) ?? active.reduce((sum, vector) => sum + vector.value * vector.trust, 0) / Math.max(1, active.length));
  const nti = clamp01(numeric(row.nti) ?? active.reduce((sum, vector) => sum + vector.volatility + vector.velocity, 0) / Math.max(1, active.length * 2));
  const regime = wsi >= 0.65 || nti >= 0.70 ? 'CRITICAL' : wsi >= 0.38 || nti >= 0.42 ? 'TENSION' : 'LOW';

  return {
    ok: true,
    snapshot: {
      id: row.id,
      observed_at: row.observed_at,
      vectors,
      wsi: Number(wsi.toFixed(4)),
      nti: Number(nti.toFixed(4)),
      regime,
      status: active.length > 0 ? 'ACTIVE' : 'BOOTSTRAPPED',
      sourceCoverage: active.length / Math.max(1, vectors.length),
      degradedSources: [],
    },
    status: active.length > 0 ? 'ACTIVE' : 'BOOTSTRAPPED',
  };
}
