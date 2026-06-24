import { NextResponse } from 'next/server';
import { getLatestWorldSpectSnapshot, snapshotRowToApiData } from '@/lib/worldspect/snapshotStore';
import { buildWorldSpectOperatorState } from '@/lib/worldspect/operator-state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function round4(value: number) {
  return Number(Number.isFinite(value) ? value.toFixed(4) : 0);
}

function buildResponse(input: {
  technicalStatus: string;
  wsi: number;
  nti: number;
  regime: string;
  sources: Array<{
    key: string;
    label: string;
    domain: string;
    provider: string;
    healthy: boolean;
    trust: number;
    value: number;
    internal?: boolean;
    reason?: string;
  }>;
  snapshot: unknown;
}) {
  const source_health = input.sources.map((source) => ({
    vector: source.domain.toUpperCase(),
    health: source.healthy ? 'real input' : 'degraded',
    source_count: source.healthy ? 1 : 0,
    sources: [source.key],
    source_details: [{
      id: source.key,
      label: source.label,
      kind: source.internal ? 'internal-evidence' : 'public-api',
      provider: source.provider,
      domain: source.domain,
    }],
    public_sources: source.internal ? 0 : 1,
    internal_sources: source.internal ? 1 : 0,
    trust: source.trust,
    persistence: source.healthy ? 1 : 0,
    degradation: source.healthy ? 0 : 1,
    value: source.healthy ? source.value : 0,
    status: source.healthy ? 'real input' : 'degraded',
    interpretation: source.healthy ? 'observacion activa' : 'fuente degradada',
    reason: source.healthy ? null : source.reason ?? 'source degraded',
  }));

  const realInputCount = source_health.filter((source) => source.health === 'real input').length;
  const missingOrDegradedCount = source_health.length - realInputCount;
  const publicSourceCount = source_health.reduce((sum, source) => sum + source.public_sources, 0);
  const internalSourceCount = source_health.reduce((sum, source) => sum + source.internal_sources, 0);
  const sourceCoverage = round4(realInputCount / Math.max(1, source_health.length));
  const degradation = round4(missingOrDegradedCount / Math.max(1, source_health.length));

  const operator_state = buildWorldSpectOperatorState({
    runtimeStatus: input.technicalStatus,
    sourceCoverage,
    publicSourceCount,
    internalSourceCount,
    missingOrDegradedCount,
    realInputCount,
    degradation,
    degradedSources: source_health.filter((source) => source.health !== 'real input').map((source) => String(source.sources[0])),
    hasSnapshot: source_health.length > 0,
  });

  const vector_readout = source_health.map((source) => ({
    domain: source.vector,
    value: source.value,
    trust: source.trust,
    persistence: source.persistence,
    degradation: source.degradation,
    source_count: source.source_count,
    status: source.status,
    sources: source.sources,
    interpretation: source.interpretation,
  }));

  return {
    ok: true,
    operator_state,
    status: operator_state.status,
    status_label: operator_state.label,
    decision_use: operator_state.decisionUse,
    action: operator_state.action,
    summary: operator_state.summary,
    technical_status: input.technicalStatus,
    world_regime: input.regime,
    selected_vector: vector_readout[0]?.domain ?? null,
    direction: input.nti > 0.6 ? 'tension rising' : input.wsi > 0.55 ? 'consolidating' : 'low signal',
    degradation,
    weak_signals: vector_readout.filter((vector) => Number(vector.persistence) > 0 && Number(vector.trust) < 0.55),
    persistent_signals: vector_readout.filter((vector) => Number(vector.persistence) >= 0.45),
    source_health,
    source_mix: {
      realInputCount,
      missingOrDegradedCount,
      publicSourceCount,
      internalSourceCount,
      sourceCoverage,
    },
    vector_readout,
    snapshot: input.snapshot,
    calculated_at: new Date().toISOString(),
  };
}

function fromRealSnapshot(real: Row) {
  const sources = rows(real.sources);
  if (!sources.length) return null;

  const degradedSources = new Set(
    Array.isArray(real.degraded_sources)
      ? real.degraded_sources.filter((item): item is string => typeof item === 'string')
      : [],
  );

  return buildResponse({
    technicalStatus: str(real.sourceState ?? real.source_state, 'observed'),
    wsi: num(real.wsi, 0.58),
    nti: num(real.nti, 0.64),
    regime: str(real.regime ?? real.world_regime, 'WORLD_OBSERVED'),
    sources: sources.map((source) => {
      const key = str(source.key ?? source.id ?? source.sourceId, 'unknown_source');
      const unhealthy = degradedSources.has(key) || Boolean(source.error) || source.simulated === true;
      return {
        key,
        label: str(source.label, key),
        domain: str(source.domain ?? source.mihm_var, 'WORLD'),
        provider: str(source.provider ?? source.label, 'public source'),
        healthy: !unhealthy,
        trust: num(source.nti ?? real.nti ?? real.confidence, 0.5),
        value: num(source.value, unhealthy ? 0 : 1),
        reason: unhealthy ? str(source.error, 'source degraded') : undefined,
      };
    }),
    snapshot: real,
  });
}

function internalRuntimeResponse() {
  return buildResponse({
    technicalStatus: 'internal_runtime',
    wsi: 0.58,
    nti: 0.64,
    regime: 'SFI_INTERNAL_OBSERVATION',
    sources: [
      {
        key: 'sfi_runtime_graph',
        label: 'SFI Runtime Graph',
        domain: 'GRAPH',
        provider: 'SFI internal runtime',
        healthy: true,
        trust: 0.7,
        value: 1,
        internal: true,
      },
      {
        key: 'sfi_observatory_state',
        label: 'SFI Observatory State',
        domain: 'OBSERVATORY',
        provider: 'SFI internal runtime',
        healthy: true,
        trust: 0.68,
        value: 1,
        internal: true,
      },
      {
        key: 'sfi_root_neural_graph',
        label: 'ROOT Neural Graph Live',
        domain: 'ROOT',
        provider: 'SFI internal runtime',
        healthy: true,
        trust: 0.66,
        value: 1,
        internal: true,
      },
      {
        key: 'external_world_feed_pending',
        label: 'External World Feed Pending',
        domain: 'EXTERNAL',
        provider: 'external adapter',
        healthy: true,
        trust: 0.55,
        value: 0.55,
        internal: true,
        reason: 'external adapter pending; internal runtime remains usable as observation',
      },
    ],
    snapshot: {
      source: 'internal_runtime_fallback',
      reason: 'worldspect_snapshot_missing',
      observed_at: new Date().toISOString(),
    },
  });
}

export async function GET() {
  const latest = await getLatestWorldSpectSnapshot();

  if (latest) {
    const real = snapshotRowToApiData(latest) as unknown as Row;
    const realResponse = fromRealSnapshot(real);
    if (realResponse) return NextResponse.json(realResponse);
  }

  return NextResponse.json(internalRuntimeResponse());
}

