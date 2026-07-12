import 'server-only';
import { readRootAgents } from './readers/readRootAgents';
import { readRootAmv } from './readers/readRootAmv';
import { readRootEvidenceGraph } from './readers/readRootEvidenceGraph';
import { readRootExecution } from './readers/readRootExecution';
import { readRootGovernanceQueue } from './readers/readRootGovernanceQueue';
import { readRootPredictions } from './readers/readRootPredictions';
import { readRootSystemState } from './readers/readRootSystemState';
import { dateValue, numberValue, row, text } from './readers/readerSupport';
import { observedValue, type RootSovereignState, type RootSource, type RootSystemItem } from './rootSovereignState';

function item(input: {
  id: string;
  label: string;
  state: string | null;
  source: string;
  observedAt: string | null;
  confidence?: number | null;
  openItems: number | null;
  warning?: string | null;
  explanation: string;
}): RootSystemItem {
  return {
    id: input.id,
    label: input.label,
    state: observedValue({ value: input.state, source: input.source, observedAt: input.observedAt, confidence: input.confidence, explanation: input.explanation, warning: input.warning, status: input.warning ? 'degraded' : input.state ? 'observed' : 'missing' }),
    openItems: observedValue({ value: input.openItems, source: input.source, observedAt: input.observedAt, explanation: 'Conteo directo de filas abiertas; no es un porcentaje.', warning: input.warning, status: input.warning ? 'degraded' : input.openItems === null ? 'missing' : 'observed' }),
  };
}

function warnings(sources: Array<RootSource<unknown>>) {
  return sources.flatMap((entry) => entry.error ? entry.error.split(' | ') : []);
}

export async function readRootSovereignState(): Promise<RootSovereignState> {
  const [system, governance, agents, predictions, amv, evidence, execution] = await Promise.all([
    readRootSystemState(),
    readRootGovernanceQueue(),
    readRootAgents(),
    readRootPredictions(),
    readRootAmv(),
    readRootEvidenceGraph(),
    readRootExecution(),
  ]);
  const governanceRuntime = row(system.data.governance);
  const world = row(system.data.worldVector);
  const openMutations = governance.data.mutations.filter((entry) => !['closed', 'executed'].includes(text(entry.status).toLowerCase())).length;
  const openProposals = governance.data.proposals.filter((entry) => !['executed', 'blocked', 'rejected'].includes(text(entry.status).toLowerCase())).length;
  const openPredictions = predictions.data.runs.filter((entry) => !['completed', 'closed', 'failed'].includes(text(entry.status).toLowerCase())).length;
  const missingPredictiveContract = Boolean(predictions.error?.includes('sfi_predictive_'));
  const matrix: RootSystemItem[] = [
    item({ id: 'governance', label: 'Governance', state: text(governanceRuntime.status, '') || null, source: 'governanceRuntime', observedAt: dateValue(governanceRuntime.acpLastSeenAt), openItems: openProposals + openMutations, warning: text(governanceRuntime.warning, '') || governance.error, explanation: 'Estado ACP observado por el runtime de gobernanza.' }),
    item({ id: 'world-vector', label: 'World Vector', state: text(world.status, '') || null, source: 'world_vector_observations', observedAt: dateValue(world.observed_at), confidence: numberValue(world.confidence), openItems: null, warning: system.error, explanation: 'Última observación persistida de World Vector.' }),
    item({ id: 'neural-graph', label: 'Neural Graph', state: evidence.data.nodes.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.data.nodes.length || null, warning: evidence.error, explanation: 'Nodos y relaciones persistidos; el layout se deriva en cliente.' }),
    item({ id: 'amv', label: 'AMV', state: amv.data.memories.length ? 'observed' : null, source: amv.source, observedAt: amv.observedAt, openItems: amv.data.memories.length || null, warning: amv.error, explanation: 'Memoria AMV persistida. Ingesta no equivale a verificación.' }),
    item({ id: 'predictive', label: 'Predictive Engine', state: missingPredictiveContract ? 'SIN CONTRATO' : predictions.data.models.length ? 'observed' : null, source: 'sfi_predictive_*', observedAt: predictions.observedAt, openItems: missingPredictiveContract ? null : openPredictions, warning: predictions.error, explanation: 'Motor calibrado separado del registro manual legacy.' }),
    item({ id: 'evidence', label: 'Evidence', state: evidence.data.entries.length || evidence.data.ledger.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.data.entries.length + evidence.data.ledger.length || null, warning: evidence.error, explanation: 'Evidencia persistida en ledger ROOT/SFI.' }),
    item({ id: 'cycle', label: 'Operational Cycle', state: execution.data.recentActions.length ? 'observed' : null, source: execution.source, observedAt: execution.observedAt, openItems: null, warning: execution.error, explanation: 'Últimas acciones auditadas; existencia de fuente no implica proceso en ejecución.' }),
  ];
  return {
    generatedAt: new Date().toISOString(),
    system: { ...system, data: { ...system.data, matrix } },
    governance,
    agents,
    predictions,
    amv,
    evidence,
    execution,
    warnings: [...new Set(warnings([system, governance, agents, predictions, amv, evidence, execution]))],
  };
}
