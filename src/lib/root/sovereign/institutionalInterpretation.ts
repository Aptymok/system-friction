import type { RootDataStatus, RootSovereignState } from './rootSovereignState';

export type RootInstitutionalFact = {
  id: string;
  label: string;
  value: string;
  status: RootDataStatus;
  source: string;
  observedAt: string | null;
  evidenceIds: string[];
  explanation: string;
  warning: string | null;
};

export type RootInstitutionalDivergence = {
  id: string;
  status: 'blocking' | 'degraded' | 'open';
  title: string;
  observation: string;
  source: string;
};

export type RootInstitutionalInterpretation = {
  schemaVersion: '2026-08-07.root-institutional-interpretation.v1';
  generatedAt: string;
  headline: string;
  narrative: string[];
  facts: RootInstitutionalFact[];
  divergences: RootInstitutionalDivergence[];
};

type RootStateInput = Omit<RootSovereignState, 'interpretation'>;
type SourceLike = { source: string; observedAt: string | null; error: string | null };

function latest(values: Array<string | null>) {
  const valid = values.filter((value): value is string => Boolean(value)).map((value) => ({ value, time: new Date(value).valueOf() })).filter((entry) => Number.isFinite(entry.time)).sort((a, b) => b.time - a.time);
  return valid[0]?.value ?? null;
}
function matrixValue(state: RootStateInput, ids: string[]) {
  for (const id of ids) {
    const entry = state.system.data.matrix.find((item) => item.id === id);
    const raw = entry?.state.value;
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
function traceability(state: RootStateInput) {
  const nodes = state.evidence.data.nodes;
  const edges = state.evidence.data.edges;
  const tracedNodes = nodes.filter((node) => node.evidenceIds.length > 0 || node.lineage.length > 0).length;
  const tracedEdges = edges.filter((edge) => edge.evidenceIds.length > 0).length;
  const total = nodes.length + edges.length;
  const traced = tracedNodes + tracedEdges;
  const status: RootDataStatus = total === 0 ? 'missing' : traced === total ? 'observed' : traced > 0 ? 'degraded' : 'missing';
  return { nodes: nodes.length, edges: edges.length, tracedNodes, tracedEdges, total, traced, status };
}
function capabilityState(state: RootStateInput) {
  const rows = state.execution.data.capabilities;
  const available = rows.filter((entry) => entry.state === 'available').length;
  const partial = rows.filter((entry) => entry.state === 'partial').length;
  const gated = rows.filter((entry) => entry.state === 'gated').length;
  const status: RootDataStatus = rows.length === 0 ? 'missing' : available === rows.length ? 'observed' : available > 0 || partial > 0 ? 'degraded' : 'gated';
  return { total: rows.length, available, partial, gated, status };
}

export function interpretRootInstitution(state: RootStateInput): RootInstitutionalInterpretation {
  const sources: SourceLike[] = [state.system, state.governance, state.agents, state.predictions, state.amv, state.evidence, state.execution, state.telemetry, state.cognitiveRuntime];
  const healthySources = sources.filter((source) => !source.error);
  const failedSources = sources.filter((source) => Boolean(source.error));
  const trace = traceability(state);
  const capability = capabilityState(state);
  const runtime = state.cognitiveRuntime.data;
  const runtimeOperational = runtime.agents.filter((agent) => agent.status === 'operational').length;
  const runtimeGated = runtime.agents.filter((agent) => agent.status === 'gated').length;
  const runtimeDegraded = runtime.agents.filter((agent) => agent.status === 'degraded').length;
  const runtimeMissing = runtime.agents.filter((agent) => agent.status === 'missing').length;
  const phi = matrixValue(state, ['phi_sfi', 'phi_sf', 'phi']);
  const evidenceCount = state.evidence.data.entries.length + state.evidence.data.ledger.length;
  const attractorCount = state.amv.data.attractors.length;
  const governanceRows = state.governance.data.audits.length + state.governance.data.events.length + state.governance.data.mutations.length;

  const facts: RootInstitutionalFact[] = [
    { id: 'institutional-position', label: 'Posición institucional', value: phi === null ? 'No determinada' : `ΦSFI ${phi.toFixed(3)}`, status: phi === null ? 'missing' : 'derived', source: 'Math Core / sfi_indicator_snapshots', observedAt: state.system.observedAt, evidenceIds: [], explanation: phi === null ? 'No existe una lectura ΦSFI suficiente en este corte.' : 'Lectura derivada disponible; no sustituye sus variables constitutivas.', warning: null },
    { id: 'source-health', label: 'Fuentes de ROOT', value: `${healthySources.length}/${sources.length} sin error`, status: failedSources.length === 0 ? 'observed' : healthySources.length ? 'degraded' : 'missing', source: 'rootSovereignAdapter readers', observedAt: latest(sources.map((source) => source.observedAt)), evidenceIds: [], explanation: failedSources.length ? `${failedSources.length} lector(es) reportan error o degradación.` : 'Todos los lectores consultados respondieron sin error.', warning: failedSources.map((source) => `${source.source}: ${source.error}`).join(' | ') || null },
    { id: 'cognitive-execution', label: 'Runtime cognitivo', value: `${runtimeOperational}/${runtime.agents.length} con ejecución observada`, status: runtime.status === 'operational' ? 'observed' : runtime.status === 'degraded' ? 'degraded' : runtime.status === 'gated' ? 'gated' : 'missing', source: state.cognitiveRuntime.source, observedAt: state.cognitiveRuntime.observedAt, evidenceIds: runtime.eventGraph.recentEvents.filter((event) => event.eventName === 'SFI_AGENT_EXECUTED').map((event) => event.eventId).filter(Boolean), explanation: `${runtimeGated} gated · ${runtimeDegraded} degradados · ${runtimeMissing} missing. Registro y executor no constituyen ejecución.`, warning: state.cognitiveRuntime.error },
    { id: 'traceability', label: 'Trazabilidad del grafo', value: trace.total === 0 ? 'Sin grafo persistido' : `${trace.traced}/${trace.total} elementos con evidencia o linaje`, status: trace.status, source: state.evidence.source, observedAt: state.evidence.observedAt, evidenceIds: state.evidence.data.nodes.flatMap((node) => node.evidenceIds).concat(state.evidence.data.edges.flatMap((edge) => edge.evidenceIds)), explanation: `${trace.tracedNodes}/${trace.nodes} nodos trazados · ${trace.tracedEdges}/${trace.edges} relaciones trazadas.`, warning: state.evidence.error },
    { id: 'execution-capability', label: 'Capacidad ejecutable', value: `${capability.available}/${capability.total} disponibles`, status: capability.status, source: state.execution.source, observedAt: state.execution.observedAt, evidenceIds: [], explanation: `${capability.partial} parciales · ${capability.gated} gated. Una ruta registrada no equivale a ejecución.`, warning: state.execution.error },
    { id: 'governance-audit', label: 'Gobernanza y auditoría', value: `${governanceRows} registros persistidos`, status: state.governance.error ? 'degraded' : governanceRows > 0 ? 'observed' : 'missing', source: state.governance.source, observedAt: state.governance.observedAt, evidenceIds: [], explanation: `${state.governance.data.audits.length} auditorías · ${state.governance.data.events.length} eventos · ${state.governance.data.mutations.length} mutaciones.`, warning: state.governance.error },
    { id: 'evidence-presence', label: 'Evidencia persistida', value: String(evidenceCount), status: state.evidence.error ? 'degraded' : evidenceCount > 0 ? 'observed' : 'missing', source: state.evidence.source, observedAt: state.evidence.observedAt, evidenceIds: state.evidence.data.nodes.flatMap((node) => node.evidenceIds), explanation: `${state.evidence.data.entries.length} entradas ROOT · ${state.evidence.data.ledger.length} registros de ledger. Cantidad no equivale a fuerza probatoria.`, warning: state.evidence.error },
    { id: 'institutional-attractor', label: 'Atractor institucional', value: attractorCount ? `${attractorCount} persistido(s)` : 'No visible en este lector', status: state.amv.error ? 'degraded' : attractorCount > 0 ? 'observed' : 'missing', source: state.amv.source, observedAt: state.amv.observedAt, evidenceIds: [], explanation: attractorCount ? 'ROOT dispone de atractor persistido para contraste.' : 'ROOT no debe inferir convergencia sin un atractor expuesto por el lector correspondiente.', warning: state.amv.error },
  ];

  const divergences: RootInstitutionalDivergence[] = [];
  if (failedSources.length) divergences.push({ id: 'reader-errors', status: healthySources.length ? 'degraded' : 'blocking', title: 'Lectores con error', observation: `${failedSources.length}/${sources.length} fuentes no respondieron limpiamente.`, source: 'rootSovereignAdapter readers' });
  if (runtime.status !== 'operational') divergences.push({ id: 'cognitive-continuity', status: runtime.status === 'missing' ? 'blocking' : 'degraded', title: 'Continuidad cognitiva no demostrada', observation: `${runtimeOperational}/${runtime.agents.length} agentes tienen ejecución observada en la ventana del propio runtime.`, source: state.cognitiveRuntime.source });
  if (trace.status !== 'observed') divergences.push({ id: 'graph-traceability', status: trace.total === 0 ? 'blocking' : 'degraded', title: 'Trazabilidad incompleta', observation: trace.total === 0 ? 'No existe grafo persistido en este lector.' : `${trace.total - trace.traced}/${trace.total} elementos carecen de evidencia o linaje.`, source: state.evidence.source });
  if (capability.status !== 'observed') divergences.push({ id: 'capability-gap', status: capability.available === 0 ? 'blocking' : 'degraded', title: 'Capacidad declarada mayor que capacidad disponible', observation: `${capability.available}/${capability.total} capacidades están disponibles; ${capability.partial} parciales; ${capability.gated} gated.`, source: state.execution.source });
  if (!attractorCount) divergences.push({ id: 'attractor-reader-gap', status: 'open', title: 'Atractor no expuesto por este lector', observation: 'La dirección institucional no debe reconstruirse desde texto de interfaz.', source: state.amv.source });
  if (phi === null) divergences.push({ id: 'institutional-position-gap', status: 'open', title: 'Posición institucional no determinada', observation: 'ROOT no dispone de ΦSFI suficiente en este corte.', source: 'Math Core / sfi_indicator_snapshots' });

  const headline = divergences.some((item) => item.status === 'blocking')
    ? 'SFI observa su estado, pero conserva dependencias sin evidencia suficiente para declarar continuidad institucional completa.'
    : divergences.some((item) => item.status === 'degraded')
      ? 'SFI mantiene observación institucional con divergencias explícitas entre capacidad, trazabilidad y ejecución.'
      : 'SFI mantiene observación institucional sin divergencias bloqueantes en las fuentes consultadas.';

  const narrative = [
    `ROOT recibió ${healthySources.length}/${sources.length} fuentes sin error en este corte.`,
    `El runtime cognitivo registra ${runtime.agents.length} agentes y observa ejecución reciente en ${runtimeOperational}; los demás permanecen explícitamente gated, degradados o missing según evidencia persistida.`,
    trace.total === 0 ? 'El grafo de evidencia no está disponible en este corte.' : `El grafo expone ${trace.nodes} nodos y ${trace.edges} relaciones; ${trace.traced} de ${trace.total} elementos conservan evidencia o linaje explícito.`,
    capability.total === 0 ? 'No hay capacidades ejecutables expuestas por el lector de ejecución.' : `El lector de ejecución expone ${capability.total} capacidades: ${capability.available} disponibles, ${capability.partial} parciales y ${capability.gated} gated.`,
    phi === null ? 'La posición ΦSFI permanece no determinada.' : `La posición institucional derivada disponible es ΦSFI ${phi.toFixed(3)}.`,
  ];

  return { schemaVersion: '2026-08-07.root-institutional-interpretation.v1', generatedAt: state.generatedAt, headline, narrative, facts, divergences };
}
