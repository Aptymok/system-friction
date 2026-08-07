import 'server-only';
import { readRootAgents } from './readers/readRootAgents';
import { readRootAmv } from './readers/readRootAmv';
import { readRootCognitiveRuntime } from './readers/readRootCognitiveRuntime';
import { readRootEvidenceGraph } from './readers/readRootEvidenceGraph';
import { readRootExecution } from './readers/readRootExecution';
import { readRootGovernanceQueue } from './readers/readRootGovernanceQueue';
import { readRootMihmMatrix } from './readers/readRootMihmMatrix';
import { readRootPredictions } from './readers/readRootPredictions';
import { readRootSystemState } from './readers/readRootSystemState';
import { readRootTelemetry } from './readers/readRootTelemetry';
import { dateValue, row, text } from './readers/readerSupport';
import { interpretRootInstitution } from './institutionalInterpretation';
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
function warnings(sources: Array<RootSource<unknown>>) { return sources.flatMap((entry) => entry.error ? entry.error.split(' | ') : []); }

export async function readRootSovereignState(): Promise<RootSovereignState> {
  const [system, governance, agents, predictions, amv, evidence, execution, mihmMatrix, telemetry, cognitiveRuntime] = await Promise.all([
    readRootSystemState(), readRootGovernanceQueue(), readRootAgents(), readRootPredictions(), readRootAmv(), readRootEvidenceGraph(), readRootExecution(), readRootMihmMatrix(), readRootTelemetry(), readRootCognitiveRuntime(),
  ]);

  const governanceRuntime = row(system.data.governance);
  const openMutations = governance.error ? null : governance.data.mutations.filter((entry) => !['closed', 'executed'].includes(text(entry.status).toLowerCase())).length;
  const openProposals = governance.error ? null : governance.data.proposals.filter((entry) => !['executed', 'blocked', 'rejected'].includes(text(entry.status).toLowerCase())).length;
  const openPredictions = predictions.error ? null : predictions.data.runs.filter((entry) => ['OPEN', 'WAITING_EVIDENCE', 'DUE'].includes(text(entry.status).toUpperCase())).length;
  const predictiveState = predictions.error ? 'degraded' : predictions.data.models.length ? 'observed' : predictions.data.legacyEntries.length ? 'legacy_only' : null;

  const matrix: RootSystemItem[] = [
    item({ id: 'governance', label: 'Governance', state: text(governanceRuntime.status, '') || null, source: 'governanceRuntime', observedAt: dateValue(governanceRuntime.acpLastSeenAt), openItems: openProposals === null || openMutations === null ? null : openProposals + openMutations, warning: text(governanceRuntime.warning, '') || governance.error, explanation: 'Estado ACP observado por el runtime de gobernanza.' }),
    item({ id: 'neural-graph', label: 'Neural Graph', state: evidence.data.nodes.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.error ? null : evidence.data.nodes.length, warning: evidence.error, explanation: 'Nodos y relaciones persistidos. La representación visual no constituye evidencia adicional.' }),
    item({ id: 'amv', label: 'AMV', state: amv.data.memories.length || amv.data.attractors.length || amv.data.ejectors.length ? 'observed' : null, source: amv.source, observedAt: amv.observedAt, openItems: amv.error ? null : amv.data.memories.length + amv.data.attractors.length + amv.data.ejectors.length, warning: amv.error, explanation: 'Memoria AMV, atractores y eyectores persistidos. Ingesta no equivale a verificación.' }),
    item({ id: 'predictive', label: 'Predictive Engine', state: predictiveState, source: 'sfi_predictive_*', observedAt: predictions.observedAt, openItems: openPredictions, warning: predictions.error, explanation: 'Motor predictivo persistido, separado del registro manual legacy.' }),
    item({ id: 'cognitive-runtime', label: 'Cognitive Runtime', state: cognitiveRuntime.data.status, source: cognitiveRuntime.source, observedAt: cognitiveRuntime.observedAt, openItems: cognitiveRuntime.data.contract.registeredAgents, warning: cognitiveRuntime.error, explanation: 'Registro, executor, ejecución observada y autoridad permanecen separados.' }),
    item({ id: 'evidence', label: 'Evidence', state: evidence.data.entries.length || evidence.data.ledger.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.error ? null : evidence.data.entries.length + evidence.data.ledger.length, warning: evidence.error, explanation: 'Evidencia persistida en ledger ROOT/SFI.' }),
    item({ id: 'cycle', label: 'ROOT Audited Activity', state: execution.data.recentActions.length ? 'observed' : null, source: execution.source, observedAt: execution.observedAt, openItems: null, warning: execution.error, explanation: 'Actividad ROOT auditada. No afirma por sí misma que un ciclo esté ejecutándose.' }),
    ...mihmMatrix,
  ];

  const generatedAt = new Date().toISOString();
  const base: Omit<RootSovereignState, 'interpretation'> = {
    generatedAt,
    system: { ...system, data: { ...system.data, matrix } },
    governance,
    agents,
    predictions,
    amv,
    evidence,
    execution,
    telemetry,
    cognitiveRuntime,
    warnings: [...new Set(warnings([system, governance, agents, predictions, amv, evidence, execution, cognitiveRuntime]))],
  };
  const interpretation = interpretRootInstitution(base);
  return { ...base, interpretation };
}
