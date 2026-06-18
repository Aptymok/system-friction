import { NextResponse } from 'next/server';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import { WORLDSPECT_DOMAINS, type WorldSpectDomain } from '@/lib/worldspect/vector-contract';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

type EvidenceTrace = {
  id: string;
  kind: 'internal' | 'external';
  vector: WorldSpectDomain;
  source_key: string;
  label: string;
  provider: string;
  observed_at: string;
  value: number | null;
  weight: number | null;
  trust: number | null;
  evidence_ref: string;
  summary: string;
  payload: Row;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function num(value: unknown): number | null {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isInternalSource(source: Row) {
  const key = str(source.key).toLowerCase();
  const label = str(source.label).toLowerCase();
  const provider = str(source.provider).toLowerCase();
  const kind = str(source.kind).toLowerCase();
  return key.includes('sfi_internal_evidence')
    || key.includes('_internal_')
    || key.endsWith('_internal')
    || label.includes('sfi evidence')
    || provider.includes('sfi internal')
    || kind.includes('internal');
}

function domainFromSource(source: Row): WorldSpectDomain | null {
  const explicit = str(source.domain ?? source.mihm_var ?? source.vector).toUpperCase();
  if ((WORLDSPECT_DOMAINS as readonly string[]).includes(explicit)) return explicit as WorldSpectDomain;

  const key = str(source.key).toLowerCase();
  const label = str(source.label).toLowerCase();
  const text = `${key} ${label}`;

  for (const domain of WORLDSPECT_DOMAINS) {
    const lower = domain.toLowerCase();
    if (key.startsWith(`${lower}_`) || key.includes(`_${lower}_`) || label.includes(lower.replace('_', ' '))) return domain;
  }

  if (/culture|cultural|music|song|artist|media/.test(text)) return 'CULTURAL';
  if (/econom|worldbank|market|finance|gdp|inflation/.test(text)) return 'ECONOMY';
  if (/geo.?digital|hacker|hn|platform|network|traffic|algolia/.test(text)) return 'GEO_DIGITAL';
  if (/geopolit|war|border|election|state|policy/.test(text)) return 'GEOPOLITICAL';
  if (/bio|clinical|health|medical|trial/.test(text)) return 'BIO';
  if (/climate|weather|meteo|carbon|temperature|water/.test(text)) return 'CLIMATE';
  if (/institution|governance|law|regulat/.test(text)) return 'INSTITUTIONAL';
  if (/memetic|meme|trend|attention|viral|narrative/.test(text)) return 'MEMETIC';
  if (/tech|github|software|code|ai|model|compute/.test(text)) return 'TECH';
  if (/affective|affect|sentiment|emotion|mood|feeling/.test(text)) return 'AFFECTIVE';
  return null;
}

function sourceProvider(source: Row, kind: 'internal' | 'external') {
  const key = str(source.key);
  if (str(source.provider)) return str(source.provider);
  if (kind === 'internal') return 'SFI internal evidence';
  if (key.includes('worldbank')) return 'World Bank';
  if (key.includes('github')) return 'GitHub';
  if (key.includes('_hn_') || key.includes('hacker')) return 'Hacker News / Algolia';
  if (key.includes('clinical')) return 'ClinicalTrials.gov';
  if (key.includes('meteo')) return 'Open-Meteo';
  if (key.includes('gdelt')) return 'GDELT';
  return 'public source';
}

function sourceLabel(source: Row, domain: WorldSpectDomain, kind: 'internal' | 'external') {
  if (str(source.label)) return str(source.label);
  return kind === 'internal' ? `${domain} - SFI internal evidence` : `${domain} - external evidence`;
}

function traceFromSource(source: Row, domain: WorldSpectDomain, observedAt: string): EvidenceTrace {
  const kind = isInternalSource(source) ? 'internal' : 'external';
  const key = str(source.key, `${domain.toLowerCase()}_${kind}_unknown`);
  const value = num(source.value);
  const weight = num(source.weight ?? source.nti);
  return {
    id: `${domain}:${kind}:${key}`,
    kind,
    vector: domain,
    source_key: key,
    label: sourceLabel(source, domain, kind),
    provider: sourceProvider(source, kind),
    observed_at: str(source.observed_at ?? source.ts, observedAt),
    value,
    weight,
    trust: weight ?? value,
    evidence_ref: kind === 'internal' ? `sfi://worldspect/internal/${key}` : `external://worldspect/${key}`,
    summary: kind === 'internal'
      ? `Internal SFI evidence used by ${domain}. Source ${key}.`
      : `External source used by ${domain}. Source ${key}.`,
    payload: source,
  };
}

export async function GET() {
  const [world, row] = await Promise.all([
    readWorldSpectVectorSnapshot(),
    getLatestWorldSpectSnapshot(),
  ]);

  const snapshot = world.snapshot;
  const observedAt = snapshot.observed_at;
  const vectors = rows(snapshot.vectors);
  const rawSources = rows(row?.sources ?? []);

  const traces = vectors.map((vector) => {
    const domain = str(vector.domain).toUpperCase() as WorldSpectDomain;
    const sourceKeys = Array.isArray(vector.sources) ? vector.sources.map((item) => String(item)) : [];
    const candidates = rawSources.filter((source) => {
      const sourceDomain = domainFromSource(source);
      const key = str(source.key);
      return sourceDomain === domain || sourceKeys.includes(key);
    });

    const internal_evidence = candidates
      .filter(isInternalSource)
      .map((source) => traceFromSource(source, domain, observedAt));

    const external_evidence = candidates
      .filter((source) => !isInternalSource(source))
      .filter((source) => !source.error && source.simulated !== true)
      .map((source) => traceFromSource(source, domain, observedAt));

    return {
      vector: domain,
      value: num(vector.value),
      trust: num(vector.trust),
      persistence: num(vector.persistence),
      source_count: num(vector.source_count),
      internal_evidence,
      external_evidence,
      internal_complete: internal_evidence.length > 0,
      external_complete: external_evidence.length > 0,
      complete: internal_evidence.length > 0 && external_evidence.length > 0,
      missing: {
        internal: internal_evidence.length === 0,
        external: external_evidence.length === 0,
      },
    };
  });

  const total = traces.length;
  const vectorsWithInternal = traces.filter((trace) => trace.internal_complete).length;
  const vectorsWithExternal = traces.filter((trace) => trace.external_complete).length;
  const complete = traces.filter((trace) => trace.complete).length;

  return NextResponse.json({
    ok: true,
    status: world.status === 'ACTIVE' ? 'real input' : 'degraded',
    snapshot_id: snapshot.id,
    observed_at: observedAt,
    sourceCoverage: snapshot.sourceCoverage,
    traces,
    traceCoverage: {
      total_vectors: total,
      vectors_with_internal_evidence: vectorsWithInternal,
      vectors_with_external_evidence: vectorsWithExternal,
      complete_vectors: complete,
      complete_ratio: total ? complete / total : 0,
    },
    missingInternal: traces.filter((trace) => !trace.internal_complete).map((trace) => trace.vector),
    missingExternal: traces.filter((trace) => !trace.external_complete).map((trace) => trace.vector),
    rule: 'A vector is trace-complete only when it has exact internal evidence and exact external evidence. If one side is missing, the UI must say so.',
  });
}