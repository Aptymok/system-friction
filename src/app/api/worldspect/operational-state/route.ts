import { NextResponse } from 'next/server';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';

type SourceKind = 'public-api' | 'internal-evidence';

export const dynamic = 'force-dynamic';

function round4(value: number) {
  return Number(Number.isFinite(value) ? value.toFixed(4) : 0);
}

function sourceKind(sourceId: string): SourceKind {
  return sourceId.includes('_sfi_internal_evidence') ? 'internal-evidence' : 'public-api';
}

function providerForSource(sourceId: string) {
  if (sourceId.includes('worldbank')) return 'World Bank';
  if (sourceId.includes('open_meteo')) return 'Open-Meteo';
  if (sourceId.includes('clinicaltrials')) return 'ClinicalTrials.gov';
  if (sourceId.includes('github')) return 'GitHub';
  if (sourceId.includes('_hn_')) return 'Hacker News / Algolia';
  if (sourceId.includes('gdelt')) return 'GDELT';
  if (sourceId.includes('_sfi_internal_evidence')) return 'SFI internal evidence';
  return 'unknown provider';
}

function shortProvider(sourceId: string) {
  if (sourceId.includes('worldbank')) return 'World Bank';
  if (sourceId.includes('open_meteo')) return 'Open-Meteo';
  if (sourceId.includes('clinicaltrials')) return 'ClinicalTrials';
  if (sourceId.includes('github')) return 'GitHub';
  if (sourceId.includes('_hn_')) return 'HN';
  if (sourceId.includes('gdelt')) return 'GDELT';
  if (sourceId.includes('_sfi_internal_evidence')) return 'SFI evidence';
  return sourceId;
}

function interpretationFor(vector: { trust: number; persistence: number; degradation: number; value: number; source_count: number }) {
  if (vector.source_count <= 0) return 'sin fuente activa';
  if (vector.degradation >= 0.65) return 'degradado';
  if (vector.trust >= 0.68 && vector.persistence >= 0.6) return 'persistente confiable';
  if (vector.trust >= 0.56) return 'observacion activa';
  if (vector.persistence >= 0.5) return 'senal debil coherente';
  return 'senal inicial';
}

export async function GET() {
  const result = await readWorldSpectVectorSnapshot();
  const snapshot = result.snapshot;
  const vectors = snapshot.vectors;
  const degraded = new Set(snapshot.degradedSources ?? []);

  const source_health = vectors.map((vector) => {
    const health = vector.source_count > 0
      ? 'real input'
      : degraded.has(vector.domain)
        ? 'degraded'
        : result.status === 'ACTIVE'
          ? 'unavailable'
          : 'degraded';

    const sourceDetails = (vector.sources ?? []).map((sourceId) => {
      const kind = sourceKind(sourceId);
      return {
        id: sourceId,
        label: `${vector.domain.toLowerCase()} - ${shortProvider(sourceId)}`,
        kind,
        provider: providerForSource(sourceId),
        domain: vector.domain,
      };
    });

    const publicSources = sourceDetails.filter((source) => source.kind === 'public-api').length;
    const internalSources = sourceDetails.filter((source) => source.kind === 'internal-evidence').length;

    return {
      vector: vector.domain,
      health,
      source_count: vector.source_count,
      sources: vector.sources ?? [],
      source_details: sourceDetails,
      public_sources: publicSources,
      internal_sources: internalSources,
      trust: vector.trust,
      persistence: vector.persistence,
      degradation: vector.degradation,
      value: vector.value,
      interpretation: interpretationFor(vector),
      reason: vector.source_count > 0
        ? null
        : degraded.has(vector.domain)
          ? 'domain adapters degraded'
          : 'no active source for domain',
    };
  });

  const realInputCount = source_health.filter((source) => source.health === 'real input').length;
  const missingOrDegradedCount = source_health.length - realInputCount;
  const publicSourceCount = source_health.reduce((sum, item) => sum + item.public_sources, 0);
  const internalSourceCount = source_health.reduce((sum, item) => sum + item.internal_sources, 0);

  const vector_readout = vectors.map((vector) => ({
    domain: vector.domain,
    value: vector.value,
    trust: vector.trust,
    persistence: vector.persistence,
    degradation: vector.degradation,
    source_count: vector.source_count,
    status: vector.status,
    sources: vector.sources ?? [],
    interpretation: interpretationFor(vector),
  }));

  return NextResponse.json({
    ok: true,
    status: result.status === 'ACTIVE' ? 'real input' : 'degraded',
    world_regime: snapshot.regime,
    selected_vector: vectors[0]?.domain ?? null,
    direction: snapshot.nti > 0.6 ? 'tension rising' : snapshot.wsi > 0.55 ? 'consolidating' : 'low signal',
    degradation: round4(vectors.reduce((sum, vector) => sum + vector.degradation, 0) / Math.max(1, vectors.length)),
    weak_signals: vectors.filter((vector) => vector.persistence > 0 && vector.trust < 0.55),
    persistent_signals: vectors.filter((vector) => vector.persistence >= 0.45),
    source_health,
    source_mix: {
      realInputCount,
      missingOrDegradedCount,
      publicSourceCount,
      internalSourceCount,
      sourceCoverage: round4(realInputCount / Math.max(1, source_health.length)),
    },
    vector_readout,
    snapshot,
    calculated_at: new Date().toISOString(),
  });
}
