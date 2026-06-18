import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain } from '@/lib/worldspect/vector-contract';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

type SourceLike = {
  key: string;
  label?: string;
  value: number | null;
  nti?: number | null;
  weight?: number | null;
  simulated?: boolean;
  error?: string | null;
  mihm_var?: string | null;
  raw?: unknown;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function numeric(value: unknown): number | null {
  if (value === null || typeof value === 'undefined') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function isDomain(value: unknown): value is WorldSpectDomain {
  return typeof value === 'string' && (WORLDSPECT_DOMAINS as readonly string[]).includes(value);
}

function domainForSource(source: SourceLike): WorldSpectDomain {
  const declared = String(source.mihm_var ?? '').toUpperCase();
  if (isDomain(declared)) return declared;
  const text = `${source.key} ${source.label ?? ''}`.toLowerCase();
  if (/tech|github|hn|ai|model|compute|software|code/.test(text)) return 'TECH';
  if (/music|culture|cultural|score|song|artist|media|film|cinema|writing|art/.test(text)) return 'CULTURAL';
  if (/market|econom|price|inflation|finance|gdp|worldbank/.test(text)) return 'ECONOMY';
  if (/geo.?digital|platform|network|search|social|traffic/.test(text)) return 'GEO_DIGITAL';
  if (/war|policy|geopolit|state|border|election|government/.test(text)) return 'GEOPOLITICAL';
  if (/bio|health|medical|organism|species|clinical/.test(text)) return 'BIO';
  if (/climate|weather|carbon|temperature|water|meteo/.test(text)) return 'CLIMATE';
  if (/meme|trend|attention|viral|narrative/.test(text)) return 'MEMETIC';
  if (/affect|sentiment|emotion|mood|feeling|anger|fear|hope/.test(text)) return 'AFFECTIVE';
  if (/institution|governance|law|regulat/.test(text)) return 'INSTITUTIONAL';
  return 'INSTITUTIONAL';
}

function toSources(value: unknown): SourceLike[] {
  return rows(value).map((source) => ({
    key: String(source.key ?? source.id ?? 'unknown_source'),
    label: typeof source.label === 'string' ? source.label : undefined,
    value: numeric(source.value),
    nti: numeric(source.nti),
    weight: numeric(source.weight),
    simulated: source.simulated === true,
    error: typeof source.error === 'string' ? source.error : null,
    mihm_var: typeof source.mihm_var === 'string' ? source.mihm_var : null,
    raw: source.raw,
  }));
}

function aggregateDomain(domain: WorldSpectDomain, sources: SourceLike[], observedAt: string) {
  const usable = sources.filter((source) => domainForSource(source) === domain && source.value !== null && source.simulated !== true && !source.error);
  const sourceCount = usable.length;
  if (!sourceCount) {
    return {
      domain,
      value: 0,
      trust: 0,
      persistence: 0,
      degradation: 1,
      volatility: 0,
      velocity: 0,
      source_count: 0,
      status: 'MISSING',
      observed_at: observedAt,
      sources: [],
    };
  }
  const values = usable.map((source) => clamp01(numeric(source.value) ?? 0));
  const trustValues = usable.map((source) => clamp01(numeric(source.nti) ?? numeric(source.weight) ?? numeric(source.value) ?? 0));
  const value = values.reduce((sum, item) => sum + item, 0) / sourceCount;
  const trust = trustValues.reduce((sum, item) => sum + item, 0) / sourceCount;
  const volatility = values.reduce((sum, item) => sum + Math.abs(item - value), 0) / sourceCount;
  return {
    domain,
    value: Number(value.toFixed(4)),
    trust: Number(trust.toFixed(4)),
    persistence: Number((trust * (1 - volatility)).toFixed(4)),
    degradation: Number((1 - trust).toFixed(4)),
    volatility: Number(volatility.toFixed(4)),
    velocity: Number(volatility.toFixed(4)),
    source_count: sourceCount,
    status: 'ACTIVE',
    observed_at: observedAt,
    sources: usable.map((source) => source.key),
  };
}

function classifyRegime(wsi: number, nti: number) {
  if (wsi >= 0.65 || nti >= 0.7) return 'CRITICAL';
  if (wsi >= 0.38 || nti >= 0.42) return 'TENSION';
  return 'LOW';
}

function opportunityFor(vector: ReturnType<typeof aggregateDomain>) {
  const trust = clamp01(Number(vector.trust));
  const persistence = clamp01(Number(vector.persistence));
  const degradation = clamp01(Number(vector.degradation));
  const value = clamp01(Number(vector.value));
  return Number((trust * 0.28 + persistence * 0.34 + value * 0.2 + (1 - degradation) * 0.18).toFixed(4));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(120, Math.max(5, Number(url.searchParams.get('limit') ?? 60)));
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from('worldspect_snapshots')
    .select('id, observed_at, created_at, sources, degraded_sources, wsi, nti, source_state, adapter_status, ingest_mode, snapshot_hash')
    .order('observed_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, status: 'history_unavailable', reason: error.message, timeline: [] }, { status: 200 });
  }

  const timeline = rows(data).map((row) => {
    const observedAt = String(row.observed_at ?? row.created_at ?? new Date().toISOString());
    const sources = toSources(row.sources);
    const vectors = WORLDSPECT_DOMAINS.map((domain) => aggregateDomain(domain, sources, observedAt));
    const active = vectors.filter((vector) => vector.source_count > 0);
    const wsi = clamp01(numeric(row.wsi) ?? active.reduce((sum, vector) => sum + vector.value * vector.trust, 0) / Math.max(1, active.length));
    const nti = clamp01(numeric(row.nti) ?? active.reduce((sum, vector) => sum + vector.volatility + vector.velocity, 0) / Math.max(1, active.length * 2));
    const dominant = [...active].sort((a, b) => b.persistence - a.persistence)[0] ?? null;
    const opportunities = active
      .map((vector) => ({
        domain: vector.domain,
        score: opportunityFor(vector),
        basis: {
          value: vector.value,
          trust: vector.trust,
          persistence: vector.persistence,
          degradation: vector.degradation,
          source_count: vector.source_count,
        },
      }))
      .sort((a, b) => b.score - a.score);
    const emergent = active.filter((vector) => vector.persistence >= 0.45 && vector.trust < 0.58).map((vector) => vector.domain);
    const degraded = vectors.filter((vector) => vector.source_count === 0 || vector.degradation >= 0.55).map((vector) => vector.domain);
    return {
      id: String(row.id ?? ''),
      observed_at: observedAt,
      regime: classifyRegime(wsi, nti),
      wsi: Number(wsi.toFixed(4)),
      nti: Number(nti.toFixed(4)),
      sourceCoverage: Number((active.length / Math.max(1, WORLDSPECT_DOMAINS.length)).toFixed(4)),
      activeCount: active.length,
      dominant_attractor: dominant ? {
        domain: dominant.domain,
        persistence: dominant.persistence,
        trust: dominant.trust,
        value: dominant.value,
      } : null,
      emergent,
      degraded,
      opportunities: opportunities.slice(0, 5),
      vectors,
    };
  }).reverse();

  const latest = timeline[timeline.length - 1] ?? null;
  const previous = timeline[timeline.length - 2] ?? null;
  const regimeChanged = Boolean(latest && previous && latest.regime !== previous.regime);
  const vectorDeltas = latest && previous
    ? latest.vectors.map((vector) => {
      const old = previous.vectors.find((item) => item.domain === vector.domain);
      return {
        domain: vector.domain,
        persistence_delta: Number((vector.persistence - Number(old?.persistence ?? 0)).toFixed(4)),
        degradation_delta: Number((vector.degradation - Number(old?.degradation ?? 0)).toFixed(4)),
        opportunity_delta: Number((opportunityFor(vector) - (old ? opportunityFor(old) : 0)).toFixed(4)),
      };
    })
    : [];

  return NextResponse.json({
    ok: true,
    status: timeline.length ? 'observed' : 'no_history',
    count: timeline.length,
    latest,
    previous,
    regimeChanged,
    vectorDeltas,
    timeline,
    explanation: 'Longitudinal view derived from persisted worldspect_snapshots. No synthetic snapshots are generated.',
  });
}