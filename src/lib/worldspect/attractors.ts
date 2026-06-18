import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  WORLDSPECT_DOMAINS,
  type WorldAttractor,
  type WorldSpectDomain,
} from './vector-contract';

type Row = Record<string, unknown>;

type SnapshotVector = {
  domain: WorldSpectDomain;
  value: number;
  trust: number;
  persistence: number;
  degradation: number;
  source_count: number;
  evidence_refs: string[];
};

type Snapshot = {
  id: string;
  observed_at: string;
  vectors: SnapshotVector[];
};

const ATTRACTOR_RULES: Array<{ id: string; label: string; vectors: WorldSpectDomain[] }> = [
  { id: 'institutional_digitization', label: 'institutional digitization / computational governance', vectors: ['TECH', 'INSTITUTIONAL', 'GEO_DIGITAL'] },
  { id: 'cultural_affect', label: 'cultural affect / narrative field', vectors: ['CULTURAL', 'MEMETIC', 'AFFECTIVE'] },
  { id: 'macro_pressure', label: 'macro pressure field', vectors: ['GEOPOLITICAL', 'ECONOMY', 'CLIMATE'] },
  { id: 'bio_regulatory_adaptation', label: 'bio-regulatory adaptation field', vectors: ['BIO', 'CLIMATE', 'INSTITUTIONAL'] },
];

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function isDomain(value: unknown): value is WorldSpectDomain {
  return typeof value === 'string' && (WORLDSPECT_DOMAINS as readonly string[]).includes(value);
}

function domainForSource(source: Row): WorldSpectDomain {
  const declared = String(source.mihm_var ?? source.domain ?? source.vector ?? '').toUpperCase();
  if (isDomain(declared)) return declared;
  const text = `${source.key ?? ''} ${source.label ?? ''}`.toLowerCase();
  if (/tech|github|hn|ai|model|compute|software|code/.test(text)) return 'TECH';
  if (/music|culture|cultural|score|song|artist|media|film|cinema|writing|art/.test(text)) return 'CULTURAL';
  if (/market|econom|price|inflation|finance|gdp|worldbank/.test(text)) return 'ECONOMY';
  if (/geo.?digital|platform|network|search|social|traffic/.test(text)) return 'GEO_DIGITAL';
  if (/war|policy|geopolit|state|border|election|government/.test(text)) return 'GEOPOLITICAL';
  if (/bio|health|medical|organism|species|clinical/.test(text)) return 'BIO';
  if (/climate|weather|carbon|temperature|water|meteo/.test(text)) return 'CLIMATE';
  if (/meme|trend|attention|viral|narrative/.test(text)) return 'MEMETIC';
  if (/affect|sentiment|emotion|mood|feeling|anger|fear|hope/.test(text)) return 'AFFECTIVE';
  return 'INSTITUTIONAL';
}

function vectorFor(domain: WorldSpectDomain, sources: Row[], observedAt: string): SnapshotVector {
  const usable = sources.filter((source) => domainForSource(source) === domain && source.simulated !== true && !source.error && Number.isFinite(num(source.value, NaN)));
  const sourceCount = usable.length;
  if (!sourceCount) {
    return { domain, value: 0, trust: 0, persistence: 0, degradation: 1, source_count: 0, evidence_refs: [] };
  }
  const values = usable.map((source) => clamp01(num(source.value)));
  const trustValues = usable.map((source) => clamp01(num(source.nti ?? source.weight ?? source.value)));
  const value = values.reduce((sum, item) => sum + item, 0) / sourceCount;
  const trust = trustValues.reduce((sum, item) => sum + item, 0) / sourceCount;
  const volatility = values.reduce((sum, item) => sum + Math.abs(item - value), 0) / sourceCount;
  return {
    domain,
    value: Number(value.toFixed(4)),
    trust: Number(trust.toFixed(4)),
    persistence: Number((trust * (1 - volatility)).toFixed(4)),
    degradation: Number((1 - trust).toFixed(4)),
    source_count: sourceCount,
    evidence_refs: usable.map((source) => `worldspect:${observedAt}:${String(source.key ?? source.id ?? domain)}`),
  };
}

export async function loadWorldSpectSnapshots(limit = 80): Promise<{ ok: true; snapshots: Snapshot[] } | { ok: false; error: string; snapshots: [] }> {
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('worldspect_snapshots')
    .select('id, observed_at, created_at, sources')
    .order('observed_at', { ascending: false })
    .limit(Math.max(5, Math.min(160, limit)));

  if (error) return { ok: false, error: error.message, snapshots: [] };

  const snapshots = rows(data).map((row) => {
    const observedAt = String(row.observed_at ?? row.created_at ?? new Date().toISOString());
    const sources = rows(row.sources);
    return {
      id: String(row.id ?? observedAt),
      observed_at: observedAt,
      vectors: WORLDSPECT_DOMAINS.map((domain) => vectorFor(domain, sources, observedAt)),
    };
  }).reverse();

  return { ok: true, snapshots };
}

function directionFor(current: number, previous: number, degradation: number): WorldAttractor['direction'] {
  const delta = current - previous;
  if (degradation > 0.72) return 'fragmenting';
  if (delta > 0.04) return 'strengthening';
  if (delta < -0.04) return 'weakening';
  if (current > 0) return 'forming';
  return 'unknown';
}

export function detectWorldAttractors(snapshots: Snapshot[]): WorldAttractor[] {
  if (!snapshots.length) return [];
  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots[snapshots.length - 2] ?? latest;

  return ATTRACTOR_RULES.map((rule) => {
    const currentVectors = rule.vectors.map((domain) => latest.vectors.find((vector) => vector.domain === domain)).filter((vector): vector is SnapshotVector => Boolean(vector));
    const previousVectors = rule.vectors.map((domain) => previous.vectors.find((vector) => vector.domain === domain)).filter((vector): vector is SnapshotVector => Boolean(vector));
    const evidence = currentVectors.flatMap((vector) => vector.evidence_refs);
    if (!evidence.length) return null;
    const persistence = currentVectors.reduce((sum, vector) => sum + vector.persistence, 0) / Math.max(1, currentVectors.length);
    const prevPersistence = previousVectors.reduce((sum, vector) => sum + vector.persistence, 0) / Math.max(1, previousVectors.length);
    const degradation = currentVectors.reduce((sum, vector) => sum + vector.degradation, 0) / Math.max(1, currentVectors.length);
    const trust = currentVectors.reduce((sum, vector) => sum + vector.trust, 0) / Math.max(1, currentVectors.length);
    const duration = snapshots.filter((snapshot) => rule.vectors.every((domain) => {
      const vector = snapshot.vectors.find((item) => item.domain === domain);
      return vector && vector.source_count > 0;
    })).length;
    return {
      id: rule.id,
      label: rule.label,
      vectors: rule.vectors,
      confidence: Number(clamp01((trust * 0.55) + (persistence * 0.45)).toFixed(4)),
      persistence: Number(clamp01(persistence).toFixed(4)),
      degradation: Number(clamp01(degradation).toFixed(4)),
      duration_snapshots: duration,
      direction: directionFor(persistence, prevPersistence, degradation),
      evidence_basis: evidence,
      explanation: `${rule.label} is derived from ${rule.vectors.join(' + ')} across persisted WorldSpect snapshots. Direction is based on persistence delta and degradation.`,
    } satisfies WorldAttractor;
  }).filter((item): item is WorldAttractor => Boolean(item));
}

export async function loadWorldAttractors(limit = 80) {
  const history = await loadWorldSpectSnapshots(limit);
  if (!history.ok) return { ok: false as const, status: 'history_unavailable', error: history.error, attractors: [] };
  return {
    ok: true as const,
    status: history.snapshots.length ? 'observed' : 'no_history',
    count: history.snapshots.length,
    attractors: detectWorldAttractors(history.snapshots),
  };
}
