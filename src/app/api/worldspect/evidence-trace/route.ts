import { NextResponse } from 'next/server';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';
import {
  WORLDSPECT_DOMAINS,
  type EvidenceLevel,
  type EvidenceTrace,
  type VectorEvidenceTrace,
  type WorldSpectDomain,
} from '@/lib/worldspect/vector-contract';

export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

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
  const level: EvidenceLevel = isInternalSource(source) ? 'sfi_internal' : 'world_external';
  const key = str(source.key, `${domain.toLowerCase()}_${level}_unknown`);
  const value = num(source.value);
  const weight = num(source.weight ?? source.nti);
  return {
    id: `${domain}:${level}:${key}`,
    level,
    vector: domain,
    source_id: key,
    provider: sourceProvider(source, level === 'sfi_internal' ? 'internal' : 'external'),
    observed_at: str(source.observed_at ?? source.ts, observedAt),
    value,
    weight,
    trust: weight ?? value,
    evidence_ref: level === 'sfi_internal' ? `sfi://worldspect/internal/${key}` : `external://worldspect/${key}`,
    summary: level === 'sfi_internal'
      ? `Internal SFI evidence used by ${domain}. Source ${key}.`
      : `External source used by ${domain}. Source ${key}.`,
    payload: source,
  };
}

function traceState(input: {
  world: EvidenceTrace[];
  sfi: EvidenceTrace[];
  user: EvidenceTrace[];
  caseEvidence: EvidenceTrace[];
}) {
  if (input.user.length || input.caseEvidence.length) return 'user_calibrated' as const;
  if (input.sfi.length) return 'institutionally_supported' as const;
  if (input.world.length) return 'world_observed' as const;
  return 'unobserved' as const;
}

function explanation(trace: Pick<VectorEvidenceTrace, 'state' | 'missing'>) {
  if (trace.state === 'user_calibrated') return 'World reading and user/case calibration are traceable for this vector.';
  if (trace.state === 'institutionally_supported') return 'World reading has external evidence and SFI internal support. User/case calibration is not present yet.';
  if (trace.state === 'world_observed') return 'World reading is allowed from external evidence. User/case calibration is absent and must not be claimed.';
  return trace.missing.world_external
    ? 'No traceable external evidence is linked to this vector. The system cannot claim a world reading for it.'
    : 'Trace is incomplete; allowed claims are limited to the evidence levels present.';
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

  const traces: VectorEvidenceTrace[] = vectors.map((vector) => {
    const domain = str(vector.domain).toUpperCase() as WorldSpectDomain;
    const sourceKeys = Array.isArray(vector.sources) ? vector.sources.map((item) => String(item)) : [];
    const candidates = rawSources.filter((source) => {
      const sourceDomain = domainFromSource(source);
      const key = str(source.key);
      return sourceDomain === domain || sourceKeys.includes(key);
    });

    const sfi_internal_evidence = candidates
      .filter(isInternalSource)
      .map((source) => traceFromSource(source, domain, observedAt));

    const world_external_evidence = candidates
      .filter((source) => !isInternalSource(source))
      .filter((source) => !source.error && source.simulated !== true)
      .map((source) => traceFromSource(source, domain, observedAt));
    const user_internal_evidence: EvidenceTrace[] = [];
    const case_internal_evidence: EvidenceTrace[] = [];
    const state = traceState({
      world: world_external_evidence,
      sfi: sfi_internal_evidence,
      user: user_internal_evidence,
      caseEvidence: case_internal_evidence,
    });
    const missing = {
      world_external: world_external_evidence.length === 0,
      sfi_internal: sfi_internal_evidence.length === 0,
      user_internal: user_internal_evidence.length === 0,
      case_internal: case_internal_evidence.length === 0,
    };

    const trace: VectorEvidenceTrace = {
      vector: domain,
      value: num(vector.value),
      trust: num(vector.trust),
      persistence: num(vector.persistence),
      degradation: num(vector.degradation),
      world_external_evidence,
      sfi_internal_evidence,
      user_internal_evidence,
      case_internal_evidence,
      state,
      can_claim_world_reading: world_external_evidence.length > 0,
      can_claim_sfi_reading: world_external_evidence.length > 0 && sfi_internal_evidence.length > 0,
      can_claim_user_reading: user_internal_evidence.length > 0 || case_internal_evidence.length > 0,
      missing,
      explanation: '',
    };
    return { ...trace, explanation: explanation(trace) };
  });

  const total = traces.length;
  const vectorsWithWorld = traces.filter((trace) => trace.can_claim_world_reading || trace.state === 'unobserved').length;
  const vectorsWithSfi = traces.filter((trace) => trace.can_claim_sfi_reading).length;
  const vectorsWithUser = traces.filter((trace) => trace.can_claim_user_reading).length;

  return NextResponse.json({
    ok: true,
    status: world.status === 'ACTIVE' ? 'real input' : 'degraded',
    snapshot_id: snapshot.id,
    observed_at: observedAt,
    sourceCoverage: snapshot.sourceCoverage,
    traces,
    traceCoverage: {
      total_vectors: total,
      vectors_with_world_external_evidence: vectorsWithWorld,
      vectors_with_sfi_internal_evidence: vectorsWithSfi,
      vectors_with_user_or_case_evidence: vectorsWithUser,
      world_observed_or_explicitly_unobserved: vectorsWithWorld,
      user_calibration_ratio: total ? vectorsWithUser / total : 0,
    },
    userCalibration: traces.map((trace) => ({ vector: trace.vector, state: trace.can_claim_user_reading ? 'user_calibrated' : 'user_not_calibrated' })),
    missingWorldExternal: traces.filter((trace) => trace.missing.world_external).map((trace) => trace.vector),
    missingSfiInternal: traces.filter((trace) => trace.missing.sfi_internal).map((trace) => trace.vector),
    rule: 'World readings require world_external evidence. SFI internal and user/case calibration are separate levels. New users may be user_not_calibrated without failing world traceability.',
  });
}
