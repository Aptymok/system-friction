import { getLatestWorldSpectSnapshot } from './snapshotStore';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain, type WorldSpectVector, type WorldSpectVectorSnapshot } from './vector-contract';

type SourceLike = {
  key: string;
  label?: string;
  value: number | null;
  nti?: number;
  weight?: number;
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

function domainForSource(source: SourceLike): WorldSpectDomain {
  const text = `${source.key} ${source.label ?? ''}`.toLowerCase();
  if (/music|culture|cultural|score|song|artist|media/.test(text)) return 'CULTURAL';
  if (/market|econom|price|inflation|finance|gdp/.test(text)) return 'ECONOMY';
  if (/geo.?digital|platform|network|search|social|traffic/.test(text)) return 'GEO_DIGITAL';
  if (/war|policy|geopolit|state|border|election/.test(text)) return 'GEOPOLITICAL';
  if (/bio|health|medical|organism|species/.test(text)) return 'BIO';
  if (/climate|weather|carbon|temperature|water/.test(text)) return 'CLIMATE';
  if (/institution|governance|law|regulat|public/.test(text)) return 'INSTITUTIONAL';
  if (/meme|trend|attention|viral|narrative/.test(text)) return 'MEMETIC';
  if (/tech|ai|model|compute|software|code/.test(text)) return 'TECH';
  if (/affect|sentiment|emotion|mood|feeling/.test(text)) return 'AFFECTIVE';
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
  };
}

export async function readWorldSpectVectorSnapshot(): Promise<{ ok: true; snapshot: WorldSpectVectorSnapshot } | { ok: false; error: 'worldspect_unavailable'; snapshot: null }> {
  const row = await getLatestWorldSpectSnapshot();
  if (!row) return { ok: false, error: 'worldspect_unavailable', snapshot: null };

  const sources = row.sources.map((source) => ({
    key: source.key,
    label: source.label,
    value: numeric(source.value),
    nti: numeric(source.nti) ?? undefined,
    weight: numeric(source.weight) ?? undefined,
    simulated: source.simulated,
    error: source.error,
  }));

  const vectors = WORLDSPECT_DOMAINS.map((domain) => aggregateDomain(domain, sources, row.observed_at));
  const active = vectors.filter((vector) => vector.source_count > 0);

  if (active.length === 0 && row.wsi === null && row.nti === null) {
    return { ok: false, error: 'worldspect_unavailable', snapshot: null };
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
    },
  };
}
