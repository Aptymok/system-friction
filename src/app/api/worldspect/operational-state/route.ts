import { NextResponse } from 'next/server';
import { readWorldSpectVectorSnapshot } from '@/lib/worldspect/vector-store';

export const dynamic = 'force-dynamic';

function n(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sourceKind(sourceId: string) {
  if (sourceId.includes('_sfi_internal_evidence')) return 'internal-evidence';
  if (sourceId.includes('_public')) return 'public-api';
  if (sourceId.includes('worldbank') || sourceId.includes('github') || sourceId.includes('hn') || sourceId.includes('open_meteo') || sourceId.includes('clinicaltrials')) return 'public-api';
  return 'unknown';
}

function sourceProvider(sourceId: string) {
  if (sourceId.includes('sfi_internal')) return 'SFI internal evidence';
  if (sourceId.includes('gdelt')) return 'GDELT';
  if (sourceId.includes('worldbank')) return 'World Bank';
  if (sourceId.includes('hn')) return 'Hacker News / Algolia';
  if (sourceId.includes('github')) return 'GitHub';
  if (sourceId.includes('open_meteo')) return 'Open-Meteo';
  if (sourceId.includes('clinicaltrials')) return 'ClinicalTrials.gov';
  return 'unknown provider';
}

function sourceLabel(sourceId: string) {
  return sourceId
    .replace(/_sfi_internal_evidence/g, ' Â· SFI evidence')
    .replace(/_gdelt_public/g, ' Â· GDELT')
    .replace(/_worldbank_public/g, ' Â· World Bank')
    .replace(/_hn_public/g, ' Â· HN')
    .replace(/_github_public/g, ' Â· GitHub')
    .replace(/_open_meteo_public/g, ' Â· Open-Meteo')
    .replace(/_clinicaltrials_public/g, ' Â· ClinicalTrials')
    .replace(/_/g, ' ');
}

function classifyVector(vector: { trust?: unknown; persistence?: unknown; degradation?: unknown; source_count?: unknown }) {
  const trust = n(vector.trust);
  const persistence = n(vector.persistence);
  const degradation = n(vector.degradation, 1);
  if (n(vector.source_count) <= 0) return 'sin fuente activa';
  if (trust >= 0.65 && persistence >= 0.55 && degradation <= 0.4) return 'persistente confiable';
  if (persistence >= 0.5 && trust < 0.55) return 'seÃ±al dÃ©bil coherente';
  if (degradation >= 0.55) return 'degradaciÃ³n alta';
  return 'observaciÃ³n activa';
}

export async function GET() {
  const result = await readWorldSpectVectorSnapshot();
  const snapshot = result.snapshot;
  const vectors = snapshot.vectors;
  const degraded = new Set(snapshot.degradedSources ?? []);

  const source_health = vectors.map((vector) => {
    const sourceIds = Array.isArray(vector.sources) ? vector.sources.map(String) : [];
    const health = vector.source_count > 0
      ? 'real input'
      : degraded.has(vector.domain)
        ? 'degraded'
        : result.status === 'ACTIVE'
          ? 'unavailable'
          : 'degraded';

    const source_details = sourceIds.map((sourceId) => ({
      id: sourceId,
      label: sourceLabel(sourceId),
      kind: sourceKind(sourceId),
      provider: sourceProvider(sourceId),
      domain: vector.domain,
    }));

    return {
      vector: vector.domain,
      health,
      source_count: vector.source_count,
      sources: sourceIds,
      source_details,
      public_sources: source_details.filter((source) => source.kind === 'public-api').length,
      internal_sources: source_details.filter((source) => source.kind === 'internal-evidence').length,
      trust: vector.trust,
      persistence: vector.persistence,
      degradation: vector.degradation,
      value: vector.value,
      interpretation: classifyVector(vector),
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

  return NextResponse.json({
    ok: true,
    status: result.status === 'ACTIVE' ? 'real input' : 'degraded',
    world_regime: snapshot.regime,
    selected_vector: vectors[0]?.domain ?? null,
    direction: snapshot.nti > 0.6 ? 'tension rising' : snapshot.wsi > 0.55 ? 'consolidating' : 'low signal',
    degradation: vectors.reduce((sum, vector) => sum + vector.degradation, 0) / Math.max(1, vectors.length),
    weak_signals: vectors.filter((vector) => vector.persistence > 0 && vector.trust < 0.55),
    persistent_signals: vectors.filter((vector) => vector.persistence >= 0.45),
    source_health,
    source_mix: {
      realInputCount,
      missingOrDegradedCount,
      publicSourceCount,
      internalSourceCount,
      sourceCoverage: snapshot.sourceCoverage ?? realInputCount / Math.max(1, source_health.length),
    },
    vector_readout: vectors.map((vector) => ({
      domain: vector.domain,
      value: vector.value,
      trust: vector.trust,
      persistence: vector.persistence,
      degradation: vector.degradation,
      source_count: vector.source_count,
      status: vector.status,
      sources: vector.sources ?? [],
      interpretation: classifyVector(vector),
    })),
    snapshot,
    calculated_at: new Date().toISOString(),
  }, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
