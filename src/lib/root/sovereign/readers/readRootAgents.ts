import 'server-only';
import type { RootAgent, RootDataStatus, RootRow } from '../rootSovereignState';
import { dateValue, selectRows, source, text } from './readerSupport';

type AgentInput = {
  id: string;
  role: string;
  sourceName: string;
  row: RootRow | null;
  error: string | null;
  observedAt: string | null;
  stateValue: string | null;
  lastResult: string | null;
};

function agent(input: AgentInput): RootAgent {
  const status: RootDataStatus = input.error ? 'degraded' : input.row ? 'observed' : 'missing';
  const stateValue = input.error ? 'degraded' : input.stateValue ?? (input.row ? 'observed' : 'empty');
  return {
    id: input.id,
    role: input.role,
    state: {
      value: stateValue,
      status,
      source: input.sourceName,
      observedAt: input.observedAt,
      confidence: null,
      evidenceIds: [],
      explanation: 'Estado derivado de la última fila persistida del subsistema; no es un health score.',
      warning: input.error,
    },
    provider: null,
    model: null,
    lastRun: input.observedAt,
    lastResult: input.lastResult,
    availability: input.error ? 'degraded' : input.row ? 'available' : 'empty',
    error: input.error,
  };
}

export async function readRootAgents() {
  const [world, sfiGraph, canonicalGraph, amv, prediction] = await Promise.all([
    selectRows({
      table: 'world_vector_observations',
      select: 'id,status,confidence,dominant_signal,warnings,observed_at,created_at',
      order: 'observed_at',
      limit: 1,
    }),
    selectRows({
      table: 'sfi_graph_nodes',
      select: 'id,node_key,status,updated_at,created_at',
      order: 'updated_at',
      limit: 1,
    }),
    selectRows({
      table: 'graph_nodes',
      select: 'id,node_key,node_type,epistemic_class,updated_at,created_at',
      order: 'updated_at',
      limit: 1,
    }),
    selectRows({
      table: 'sfi_amv_memory',
      select: 'id,module,evaluation,requires_human_validation,created_at',
      order: 'created_at',
      limit: 1,
    }),
    selectRows({
      table: 'sfi_predictive_runs',
      select: 'id,status,calibration_status,subject_type,subject_id,updated_at,created_at',
      order: 'updated_at',
      limit: 1,
    }),
  ]);

  const worldRow = world.rows[0] ?? null;
  const graphRow = sfiGraph.rows[0] ?? canonicalGraph.rows[0] ?? null;
  const graphError = [sfiGraph.error, canonicalGraph.error].filter(Boolean).join(' | ') || null;
  const amvRow = amv.rows[0] ?? null;
  const predictionRow = prediction.rows[0] ?? null;

  const agents: RootAgent[] = [
    agent({
      id: 'WORLD-VECTOR',
      role: 'World Vector observation',
      sourceName: 'world_vector_observations',
      row: worldRow,
      error: world.error,
      observedAt: dateValue(worldRow?.observed_at ?? worldRow?.created_at),
      stateValue: text(worldRow?.status, '') || null,
      lastResult: text(worldRow?.dominant_signal, '') || null,
    }),
    agent({
      id: 'NEURAL-GRAPH',
      role: 'Persistent evidence graph',
      sourceName: 'sfi_graph_nodes + graph_nodes',
      row: graphRow,
      error: graphError,
      observedAt: dateValue(graphRow?.updated_at ?? graphRow?.created_at),
      stateValue: text(graphRow?.status ?? graphRow?.epistemic_class, '') || null,
      lastResult: graphRow ? text(graphRow.node_key ?? graphRow.id, 'node persisted') : null,
    }),
    agent({
      id: 'AMV',
      role: 'Operational memory',
      sourceName: 'sfi_amv_memory',
      row: amvRow,
      error: amv.error,
      observedAt: dateValue(amvRow?.created_at),
      stateValue: amvRow ? 'persisted' : null,
      lastResult: amvRow ? text(amvRow.module, 'memory persisted') : null,
    }),
    agent({
      id: 'PREDICTION',
      role: 'Predictive learning engine',
      sourceName: 'sfi_predictive_runs',
      row: predictionRow,
      error: prediction.error,
      observedAt: dateValue(predictionRow?.updated_at ?? predictionRow?.created_at),
      stateValue: text(predictionRow?.status, '') || null,
      lastResult: predictionRow ? [predictionRow.subject_type, predictionRow.subject_id].filter(Boolean).map(String).join(' · ') || null : null,
    }),
  ];

  return source(
    { agents },
    'persisted subsystem status',
    [world.error, graphError, amv.error, prediction.error],
    agents.map((item) => item.lastRun).find(Boolean) ?? null,
    false,
  );
}
