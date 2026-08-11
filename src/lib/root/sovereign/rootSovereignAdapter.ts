import 'server-only';
import { readCognitiveTwinState } from '@/lib/cognitive-twin/readState';
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
import { observedValue, type RootCognitiveTwinData, type RootRow, type RootSovereignState, type RootSource, type RootSystemItem } from './rootSovereignState';

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
    openItems: observedValue({ value: input.openItems, source: input.source, observedAt: input.observedAt, explanation: 'Conteo directo de registros para esta superficie; no es un porcentaje.', warning: input.warning, status: input.warning ? 'degraded' : input.openItems === null ? 'missing' : 'observed' }),
  };
}

function warnings(sources: Array<RootSource<unknown>>) {
  return sources.flatMap((entry) => entry.error ? entry.error.split(' | ') : []);
}

function latestDate(rows: RootRow[]) {
  return rows
    .map((entry) => dateValue(entry.updated_at ?? entry.executed_at ?? entry.finished_at ?? entry.created_at))
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function numericCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function readRootSovereignState(): Promise<RootSovereignState> {
  const [system, governance, agents, predictions, amv, evidence, execution, mihmMatrix, telemetry, cognitiveRuntime, cognitiveTwinRaw] = await Promise.all([
    readRootSystemState(),
    readRootGovernanceQueue(),
    readRootAgents(),
    readRootPredictions(),
    readRootAmv(),
    readRootEvidenceGraph(),
    readRootExecution(),
    readRootMihmMatrix(),
    readRootTelemetry(),
    readRootCognitiveRuntime(),
    readCognitiveTwinState(),
  ]);

  const cognitiveMemory = cognitiveTwinRaw.recentMemory as unknown as RootRow[];
  const cognitiveDecisions = cognitiveTwinRaw.recentDecisions as unknown as RootRow[];
  const cognitiveRuns = cognitiveTwinRaw.recentRuns as unknown as RootRow[];
  const cognitiveEvaluations = cognitiveTwinRaw.recentEvaluations as unknown as RootRow[];
  const cognitiveTwinError = cognitiveTwinRaw.errors.length ? cognitiveTwinRaw.errors.join(' | ') : null;
  const cognitiveTwinCount = numericCount(cognitiveTwinRaw.counts.memory)
    + numericCount(cognitiveTwinRaw.counts.decisions)
    + numericCount(cognitiveTwinRaw.counts.runs)
    + numericCount(cognitiveTwinRaw.counts.evaluations);
  const cognitiveTwin: RootSource<RootCognitiveTwinData> = {
    data: {
      implementation: cognitiveTwinRaw.implementation as unknown as RootRow,
      counts: cognitiveTwinRaw.counts as unknown as RootRow,
      memory: cognitiveMemory,
      decisions: cognitiveDecisions,
      runs: cognitiveRuns,
      evaluations: cognitiveEvaluations,
    },
    source: 'sfi_cognitive_twin_*',
    dataClass: cognitiveTwinError ? 'degraded' : cognitiveTwinCount > 0 ? 'observed' : 'missing',
    observedAt: latestDate([...cognitiveMemory, ...cognitiveDecisions, ...cognitiveRuns, ...cognitiveEvaluations]),
    error: cognitiveTwinError,
  };

  const governanceRuntime = row(system.data.governance);
  const openMutations = governance.error ? null : governance.data.mutations.filter((entry) => !['closed', 'executed'].includes(text(entry.status).toLowerCase())).length;
  const openProposals = governance.error ? null : governance.data.proposals.filter((entry) => !['executed', 'blocked', 'rejected'].includes(text(entry.status).toLowerCase())).length;
  const openPredictions = predictions.error ? null : predictions.data.runs.filter((entry) => ['OPEN', 'WAITING_EVIDENCE', 'DUE'].includes(text(entry.status).toUpperCase())).length;
  const predictiveState = predictions.error ? 'degraded' : predictions.data.models.length ? 'observed' : predictions.data.legacyEntries.length ? 'legacy_only' : null;

  const matrix: RootSystemItem[] = [
    item({ id: 'governance', label: 'Governance', state: text(governanceRuntime.status, '') || null, source: 'governanceRuntime', observedAt: dateValue(governanceRuntime.acpLastSeenAt), openItems: openProposals === null || openMutations === null ? null : openProposals + openMutations, warning: text(governanceRuntime.warning, '') || governance.error, explanation: 'Estado ACP observado por el runtime de gobernanza.' }),
    item({ id: 'neural-graph', label: 'Neural Graph', state: evidence.data.nodes.length && evidence.data.edges.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.error ? null : evidence.data.nodes.length, warning: evidence.error || (evidence.data.nodes.length > 1 && !evidence.data.edges.length ? 'graph_nodes_without_relations' : null), explanation: 'Proyección relacional reconstruible sobre objetos canónicos de evidencia. Nodos sin relaciones no constituyen un grafo funcional.' }),
    item({ id: 'amv', label: 'AMV', state: amv.data.memories.length || amv.data.attractors.length || amv.data.ejectors.length ? 'observed' : null, source: amv.source, observedAt: amv.observedAt, openItems: amv.error ? null : amv.data.memories.length + amv.data.attractors.length + amv.data.ejectors.length, warning: amv.error, explanation: 'Memoria AMV, atractores y eyectores persistidos. Ingesta no equivale a verificación.' }),
    item({ id: 'predictive', label: 'Predictive Engine', state: predictiveState, source: 'sfi_predictive_*', observedAt: predictions.observedAt, openItems: openPredictions, warning: predictions.error, explanation: 'Motor predictivo persistido, separado del registro manual legacy y filtrado de placeholders no predictivos.' }),
    item({ id: 'cognitive-runtime', label: 'Cognitive Runtime', state: cognitiveRuntime.data.status, source: cognitiveRuntime.source, observedAt: cognitiveRuntime.observedAt, openItems: cognitiveRuntime.data.contract.registeredAgents, warning: cognitiveRuntime.error, explanation: 'Registro, executor, ejecución observada y autoridad permanecen separados.' }),
    item({ id: 'cognitive-twin', label: 'Cognitive Twin', state: cognitiveTwin.dataClass === 'observed' ? 'observed' : null, source: cognitiveTwin.source, observedAt: cognitiveTwin.observedAt, openItems: cognitiveTwin.error ? null : cognitiveTwinCount, warning: cognitiveTwin.error, explanation: 'Memoria, decisiones, evaluaciones y ejecuciones del Cognitive Twin. No se sustituyen con hipótesis del Predictive Engine.' }),
    item({ id: 'evidence', label: 'Evidence', state: evidence.data.objects.length ? 'observed' : null, source: evidence.source, observedAt: evidence.observedAt, openItems: evidence.error ? null : evidence.data.objects.length, warning: evidence.error, explanation: 'Conteo de objetos canónicos de evidencia. Duplicar su persistencia en ROOT y ledger no duplica evidencia.' }),
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
    cognitiveTwin,
    warnings: [...new Set(warnings([system, governance, agents, predictions, amv, evidence, execution, cognitiveRuntime, cognitiveTwin]))],
  };
  const interpretation = interpretRootInstitution(base);
  return { ...base, interpretation };
}
