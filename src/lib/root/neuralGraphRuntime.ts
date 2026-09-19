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
    if (result.error) return { rows: [] as Record<string, unknown>[], failed: true };
    const data = result.data as unknown;
    if (!Array.isArray(data)) return { rows: [] as Record<string, unknown>[], failed: false };
    return { rows: data as Record<string, unknown>[], failed: false };
  } catch {
    return { rows: [] as Record<string, unknown>[], failed: true };
  }
}

export async function readRootNeuralGraphRuntime(): Promise<RootNeuralGraphRuntime> {
  let nodeCount = await queryCount('graph_nodes');
  let edgeCount: number | null = null;
  let attractorRows: Record<string, unknown>[] = [];
  let ejectorRows: Record<string, unknown>[] = [];
  let scorefrictionObservationCount: number | null = null;
  let scorefrictionVectorCount: number | null = null;
  let worldspectSnapshot: string | null = null;
  let readPlane: RootNeuralGraphRuntime['readPlane'] = 'SUPABASE';
  let primaryDiagnostic: string | null = null;

  if (nodeCount === null && isSfiContinuityConfigured()) {
    primaryDiagnostic = 'supabase_root_graph_read_unavailable';
    try {
      const fallback = await readContinuityRootNeuralGraphRuntime();
      if (fallback) {
        nodeCount = numberOrZero(fallback.node_count);
        edgeCount = numberOrZero(fallback.edge_count);
        scorefrictionObservationCount = numberOrZero(fallback.scorefriction_observation_count);
        scorefrictionVectorCount = numberOrZero(fallback.scorefriction_vector_count);
        worldspectSnapshot = stringOrNull(fallback.latest_worldspect_observed_at);
        attractorRows = Array.isArray(fallback.top_attractors) ? fallback.top_attractors as Record<string, unknown>[] : [];
        ejectorRows = Array.isArray(fallback.top_ejectors) ? fallback.top_ejectors as Record<string, unknown>[] : [];
        readPlane = 'NEON';
      } else {
        readPlane = 'UNAVAILABLE';
      }
    } catch (error) {
      readPlane = 'UNAVAILABLE';
      primaryDiagnostic = `supabase_root_graph_read_unavailable; continuity=${error instanceof Error ? error.message : 'continuity_read_failed'}`;
    }
  } else if (nodeCount !== null) {
    const [edgeCountRead, attractorRead, ejectorRead, scoreObservationRead, scoreVectorRead, worldspectRead] = await Promise.all([
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

    edgeCount = edgeCountRead;
    attractorRows = attractorRead.rows;
    ejectorRows = ejectorRead.rows;
    scorefrictionObservationCount = scoreObservationRead;
    scorefrictionVectorCount = scoreVectorRead;
    worldspectSnapshot = worldspectRead;

    const primaryPartialRead = [edgeCount, scorefrictionObservationCount, scorefrictionVectorCount].some((value) => value === null)
      || attractorRead.failed
      || ejectorRead.failed;

    if (primaryPartialRead && isSfiContinuityConfigured()) {
      primaryDiagnostic = 'supabase_root_graph_partial_read_unavailable';
      try {
        const fallback = await readContinuityRootNeuralGraphRuntime();
        if (fallback) {
          nodeCount = numberOrZero(fallback.node_count);
          edgeCount = numberOrZero(fallback.edge_count);
          scorefrictionObservationCount = numberOrZero(fallback.scorefriction_observation_count);
          scorefrictionVectorCount = numberOrZero(fallback.scorefriction_vector_count);
          worldspectSnapshot = stringOrNull(fallback.latest_worldspect_observed_at);
          attractorRows = Array.isArray(fallback.top_attractors) ? fallback.top_attractors as Record<string, unknown>[] : [];
          ejectorRows = Array.isArray(fallback.top_ejectors) ? fallback.top_ejectors as Record<string, unknown>[] : [];
          readPlane = 'NEON';
        }
      } catch (error) {
        readPlane = 'SUPABASE';
        primaryDiagnostic = `supabase_root_graph_partial_read_unavailable; continuity=${error instanceof Error ? error.message : 'continuity_read_failed'}`;
      }
    }
  } else {
    readPlane = 'UNAVAILABLE';
    primaryDiagnostic = 'supabase_root_graph_read_unavailable';
  }

  const nodes = nodeCount ?? 0;
  const edges = edgeCount ?? 0;
  const attractors = attractorRows.length;
  const ejectors = ejectorRows.length;
  const density = normalize01(edges / Math.max(1, nodes * 2));
  const coverage = normalize01(attractors / Math.max(1, nodes));
  const ejectorPressure = normalize01(
    ejectorRows.length
      ? ejectorRows.reduce((sum, row) => sum + (numberOrZero(row.contradiction) + numberOrZero(row.decay)) / 2, 0) / ejectorRows.length
      : 0,
  );
  const latestUpdate = latestTimestamp([
    ...attractorRows.map((row) => stringOrNull(row.updated_at)),
    ...ejectorRows.map((row) => stringOrNull(row.updated_at)),
  ]);

  const hasGraph = nodes > 0;
  const hasEdges = edges > 0;
  const hasAttractors = attractors > 0;
  const hasEjectors = ejectors > 0;
  const hasScoreFrictionEvidence = (scorefrictionObservationCount ?? 0) > 0 && (scorefrictionVectorCount ?? 0) > 0;
  const storeLabel = readPlane === 'NEON' ? 'Neon de continuidad' : readPlane === 'SUPABASE' ? 'Supabase' : 'ningún plano disponible';

  let status: RootNeuralGraphRuntime['status'] = 'missing';
  let summary = `No hay grafo ROOT disponible en ${storeLabel}.`;

  if (hasGraph) {
    if (!hasEdges || !hasAttractors || !hasEjectors || (readPlane === 'SUPABASE' && primaryDiagnostic?.startsWith('supabase_root_graph_partial_read_unavailable'))) {
      status = 'degraded';
      summary = `El grafo ROOT existe en ${storeLabel}, pero no cuenta con suficientes conexiones, atractores o eyectores para una convergencia robusta.`;
    } else {
      status = 'operational';
      summary = `Grafo ROOT operativo desde ${storeLabel}. Los elementos de convergencia están presentes y listos para integrarse con ScoreFriction y WorldSpect.`;
      if (!hasScoreFrictionEvidence) {
        summary = `Grafo ROOT operativo desde ${storeLabel}, pero falta evidencia ScoreFriction persistida para alimentar el razonador cultural y el sistema de convergencia.`;
      }
    }
  } else if (hasEdges || hasAttractors || hasEjectors) {
    status = 'degraded';
    summary = `Hay fragmentos del grafo ROOT en ${storeLabel}, pero falta el conjunto mínimo de nodos para declarar una topología funcional.`;
  }

  return {
    nodeCount: nodes,
    edgeCount: edges,
    attractorCount: attractors,
    ejectorCount: ejectors,
    scorefrictionObservationCount,
    scorefrictionVectorCount,
    latestWorldSpectObservedAt: worldspectSnapshot,
    latestUpdate,
    graphDensity: density,
    attractorCoverage: coverage,
    ejectorPressure,
    status,
    summary,
    readPlane,
    primaryDiagnostic,
    topAttractors: attractorRows.map((row) => ({
      attractor_key: stringOrNull(row.attractor_key) ?? 'unknown',
      label: stringOrNull(row.label) ?? 'unknown',
      confidence: normalize01(numberOrZero(row.confidence)),
      persistence: normalize01(numberOrZero(row.persistence)),
      status: stringOrNull(row.status) ?? 'unknown',
    })),
    topEjectors: ejectorRows.map((row) => ({
      ejector_key: stringOrNull(row.ejector_key) ?? 'unknown',
      label: stringOrNull(row.label) ?? 'unknown',
      contradiction: normalize01(numberOrZero(row.contradiction)),
      decay: normalize01(numberOrZero(row.decay)),
      status: stringOrNull(row.status) ?? 'unknown',
    })),
  };
}
