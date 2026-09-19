import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isSfiContinuityConfigured, readContinuityRootNeuralGraphRuntime } from '@/lib/sfi/continuityPostgres';

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalize01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function latestTimestamp(values: (string | null)[]) {
  return values.filter(Boolean).sort().reverse()[0] ?? null;
}

export type RootNeuralGraphRuntime = {
  nodeCount: number;
  edgeCount: number;
  attractorCount: number;
  ejectorCount: number;
  scorefrictionObservationCount: number | null;
  scorefrictionVectorCount: number | null;
  latestWorldSpectObservedAt: string | null;
  latestUpdate: string | null;
  graphDensity: number;
  attractorCoverage: number;
  ejectorPressure: number;
  status: 'operational' | 'degraded' | 'latent' | 'missing';
  summary: string;
  readPlane: 'SUPABASE' | 'NEON' | 'UNAVAILABLE';
  primaryDiagnostic: string | null;
  topAttractors: Array<{
    attractor_key: string;
    label: string;
    confidence: number;
    persistence: number;
    status: string;
  }>;
  topEjectors: Array<{
    ejector_key: string;
    label: string;
    contradiction: number;
    decay: number;
    status: string;
  }>;
};

async function queryCount(table: string): Promise<number | null> {
  try {
    const service = createServiceSupabaseClient();
    const result = await service.from(table).select('*', { count: 'exact', head: true });
    if (result.error) return null;
    return result.count ?? 0;
  } catch {
    return null;
  }
}

async function queryRows(table: string, selectFields: string, orderBy?: { column: string; ascending: boolean }, limit = 5) {
  try {
    const service = createServiceSupabaseClient();
    let query = service.from(table).select(selectFields).limit(limit);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending });
    const result = await query;
    if (result.error) return [];
    const data = result.data as unknown;
    if (!Array.isArray(data)) return [];
    return data as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export async function readRootNeuralGraphRuntime(): Promise<RootNeuralGraphRuntime> {
  const [nodeCount, edgeCount, attractorRows, ejectorRows, scorefrictionObservationCount, scorefrictionVectorCount, worldspectSnapshot] = await Promise.all([
    queryCount('graph_nodes'),
    queryCount('graph_edges'),
    queryRows('sfi_attractors', 'attractor_key,label,confidence,persistence,status,updated_at', { column: 'weight', ascending: false }, 5),
    queryRows('sfi_ejectors', 'ejector_key,label,contradiction,decay,status,updated_at', { column: 'weight', ascending: false }, 5),
    queryCount('scorefriction_observations'),
    queryCount('scorefriction_vectors'),
    (async () => {
      try {
        const service = createServiceSupabaseClient();
        const snapshot = await service
          .from('worldspect_snapshots')
          .select('observed_at')
          .order('observed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (snapshot.error || !snapshot.data) return null;
        return stringOrNull((snapshot.data as Record<string, unknown>).observed_at);
      } catch {
        return null;
      }
    })(),
  ]);

  let readPlane: RootNeuralGraphRuntime['readPlane'] = 'SUPABASE';
  let primaryDiagnostic: string | null = null;
  let effectiveNodeCount = nodeCount;
  let effectiveEdgeCount = edgeCount;
  let effectiveAttractorRows = attractorRows;
  let effectiveEjectorRows = ejectorRows;
  let effectiveScorefrictionObservationCount = scorefrictionObservationCount;
  let effectiveScorefrictionVectorCount = scorefrictionVectorCount;
  let effectiveWorldspectSnapshot = worldspectSnapshot;

  const primaryUnavailable = [nodeCount, edgeCount, scorefrictionObservationCount, scorefrictionVectorCount].some((value) => value === null);
  if (primaryUnavailable) {
    primaryDiagnostic = 'supabase_root_graph_read_unavailable';
    if (isSfiContinuityConfigured()) {
      try {
        const fallback = await readContinuityRootNeuralGraphRuntime();
        if (fallback) {
          effectiveNodeCount = numberOrZero(fallback.node_count);
          effectiveEdgeCount = numberOrZero(fallback.edge_count);
          effectiveScorefrictionObservationCount = numberOrZero(fallback.scorefriction_observation_count);
          effectiveScorefrictionVectorCount = numberOrZero(fallback.scorefriction_vector_count);
          effectiveWorldspectSnapshot = stringOrNull(fallback.latest_worldspect_observed_at);
          effectiveAttractorRows = Array.isArray(fallback.top_attractors) ? fallback.top_attractors as Record<string, unknown>[] : [];
          effectiveEjectorRows = Array.isArray(fallback.top_ejectors) ? fallback.top_ejectors as Record<string, unknown>[] : [];
          readPlane = 'NEON';
        } else {
          readPlane = 'UNAVAILABLE';
        }
      } catch (error) {
        readPlane = 'UNAVAILABLE';
        primaryDiagnostic = `supabase_root_graph_read_unavailable; continuity=${error instanceof Error ? error.message : 'continuity_read_failed'}`;
      }
    } else {
      readPlane = 'UNAVAILABLE';
    }
  }

  const nodes = effectiveNodeCount ?? 0;
  const edges = effectiveEdgeCount ?? 0;
  const attractors = effectiveAttractorRows.length;
  const ejectors = effectiveEjectorRows.length;
  const density = normalize01(edges / Math.max(1, nodes * 2));
  const coverage = normalize01(attractors / Math.max(1, nodes));
  const ejectorPressure = normalize01(
    effectiveEjectorRows.length
      ? effectiveEjectorRows.reduce((sum, row) => sum + (numberOrZero(row.contradiction) + numberOrZero(row.decay)) / 2, 0) / effectiveEjectorRows.length
      : 0,
  );
  const latestUpdate = latestTimestamp([
    ...effectiveAttractorRows.map((row) => stringOrNull(row.updated_at)),
    ...effectiveEjectorRows.map((row) => stringOrNull(row.updated_at)),
  ]);

  const hasGraph = nodes > 0;
  const hasEdges = edges > 0;
  const hasAttractors = attractors > 0;
  const hasEjectors = ejectors > 0;
  const hasScoreFrictionEvidence = (effectiveScorefrictionObservationCount ?? 0) > 0 && (effectiveScorefrictionVectorCount ?? 0) > 0;

  let status: RootNeuralGraphRuntime['status'] = 'missing';
  let summary = 'No hay grafo ROOT persistido en Supabase.';

  if (hasGraph) {
    if (!hasEdges || !hasAttractors || !hasEjectors) {
      status = 'degraded';
      summary = 'El grafo ROOT existe pero no cuenta con suficientes conexiones, atractores o eyectores para una convergencia robusta.';
    } else {
      status = 'operational';
      summary = 'Grafo ROOT operativo en Supabase. Los elementos de convergencia están presentes y listos para integrarse con ScoreFriction y WorldSpect.';
      if (!hasScoreFrictionEvidence) {
        summary = 'Grafo ROOT operativo, pero falta evidencia ScoreFriction persistida para alimentar el razonador cultural y el sistema de convergencia.';
      }
    }
  } else if (hasEdges || hasAttractors || hasEjectors) {
    status = 'degraded';
    summary = 'Hay fragmentos del grafo ROOT pero falta el conjunto mínimo de nodos para declarar una topología funcional.';
  }

  return {
    nodeCount: nodes,
    edgeCount: edges,
    attractorCount: attractors,
    ejectorCount: ejectors,
    scorefrictionObservationCount: effectiveScorefrictionObservationCount,
    scorefrictionVectorCount: effectiveScorefrictionVectorCount,
    latestWorldSpectObservedAt: effectiveWorldspectSnapshot ?? null,
    latestUpdate,
    graphDensity: density,
    attractorCoverage: coverage,
    ejectorPressure,
    status,
    summary,
    readPlane,
    primaryDiagnostic,
    topAttractors: effectiveAttractorRows.map((row) => ({
      attractor_key: stringOrNull(row.attractor_key) ?? 'unknown',
      label: stringOrNull(row.label) ?? 'unknown',
      confidence: normalize01(numberOrZero(row.confidence)),
      persistence: normalize01(numberOrZero(row.persistence)),
      status: stringOrNull(row.status) ?? 'unknown',
    })),
    topEjectors: effectiveEjectorRows.map((row) => ({
      ejector_key: stringOrNull(row.ejector_key) ?? 'unknown',
      label: stringOrNull(row.label) ?? 'unknown',
      contradiction: normalize01(numberOrZero(row.contradiction)),
      decay: normalize01(numberOrZero(row.decay)),
      status: stringOrNull(row.status) ?? 'unknown',
    })),
  };
}
