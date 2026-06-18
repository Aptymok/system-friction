import { createServiceSupabaseClient } from '@/runtime/supabase/server';

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
    queryCount('sfi_graph_nodes'),
    queryCount('sfi_graph_edges'),
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
    scorefrictionObservationCount,
    scorefrictionVectorCount,
    latestWorldSpectObservedAt: worldspectSnapshot ?? null,
    latestUpdate,
    graphDensity: density,
    attractorCoverage: coverage,
    ejectorPressure,
    status,
    summary,
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
