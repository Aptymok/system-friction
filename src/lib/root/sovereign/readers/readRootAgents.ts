import 'server-only';

import { readObservedSfiCognitiveRuntime } from '@/lib/sfi/cognitive-runtime/observedRuntime';
import type { RootAgent, RootDataStatus } from '../rootSovereignState';
import { source } from './readerSupport';

type AgenticCapability = {
  id: string;
  name: string;
  purpose: string;
  layer: string;
  route: string;
  providerAware?: boolean;
  approvalRequired?: boolean;
};

const AGENTIC_CAPABILITIES: AgenticCapability[] = [
  { id: 'world_vector_agent', name: 'World Vector Agent', purpose: 'Integra observación mundial, oportunidades y estado operativo para producir una lectura trazable.', layer: 'observar', route: '/api/root/agentic/world-vector' },
  { id: 'moph_agent', name: 'MOP-H Agent', purpose: 'Interpreta una fricción observada y propone una perturbación mínima reversible sustentada por evidencia.', layer: 'reconstruir', route: '/api/interface/observatory/interpret', providerAware: true },
  { id: 'neural_graph_agent', name: 'Neural Graph Agent', purpose: 'Recupera relaciones y evidencia del grafo persistido sin crear conexiones de respaldo.', layer: 'relacionar', route: '/api/root/agentic/neural-graph' },
  { id: 'amv_agent', name: 'AMV Agent', purpose: 'Recupera memoria operativa, recurrencias y asociaciones institucionales persistidas.', layer: 'recordar', route: '/api/root/agentic/amv' },
  { id: 'prediction_agent', name: 'Prediction Agent', purpose: 'Formula predicciones y probabilidades con base explícita de evidencia e incertidumbre.', layer: 'proyectar', route: '/api/root/agentic/prediction' },
  { id: 'client_finder_agent', name: 'Client Finder Agent', purpose: 'Detecta oportunidades comerciales, ejecuta IFNORM y prepara una propuesta para revisión humana.', layer: 'proponer', route: '/api/root/agentic/client-finder', providerAware: true, approvalRequired: true },
  { id: 'report_agent', name: 'Report Agent', purpose: 'Genera lecturas institucionales, calibraciones, borradores y reportes sustentados por evidencia.', layer: 'reportar', route: '/api/root/agentic/report', providerAware: true, approvalRequired: true },
];

function rootStatus(status: string): RootDataStatus {
  if (status === 'operational') return 'observed';
  if (status === 'degraded') return 'degraded';
  if (status === 'missing') return 'missing';
  return 'gated';
}

export async function readRootAgents() {
  const runtime = await readObservedSfiCognitiveRuntime();
  const latestExecutions = new Map<string, { at: string | null; id: string }>();
  for (const event of runtime.eventGraph.recentEvents) {
    if (event.eventName !== 'SFI_AGENT_EXECUTED' || !event.sourceId || latestExecutions.has(event.sourceId)) continue;
    latestExecutions.set(event.sourceId, { at: event.occurredAt, id: event.eventId });
  }

  const agents: RootAgent[] = runtime.agents.map((entry) => {
    const latest = latestExecutions.get(entry.id);
    const warning = entry.evidence.warnings.length ? entry.evidence.warnings.join(' | ') : null;
    return {
      id: entry.id,
      role: entry.name,
      state: {
        value: entry.status === 'operational' ? 'ejecución observada' : entry.status === 'gated' ? 'registrado · sin ejecución reciente' : entry.status,
        status: rootStatus(entry.status),
        source: 'Cognitive Runtime observado + epistemic_events',
        observedAt: latest?.at ?? runtime.generatedAt,
        confidence: null,
        evidenceIds: latest?.id ? [latest.id] : [],
        explanation: entry.purpose,
        warning,
      },
      provider: null,
      model: null,
      lastRun: latest?.at ?? null,
      lastResult: entry.purpose,
      availability: entry.status,
      error: warning,
    };
  });

  for (const entry of AGENTIC_CAPABILITIES) {
    if (agents.some((item) => item.id === entry.id)) continue;
    agents.push({
      id: entry.id,
      role: entry.name,
      state: {
        value: entry.approvalRequired ? 'ruta registrada · requiere autorización' : 'ruta registrada · ejecución no medida aquí',
        status: 'gated',
        source: 'Registro de capacidades agentic; no constituye prueba de ejecución',
        observedAt: null,
        confidence: null,
        evidenceIds: [],
        explanation: `Capa ${entry.layer}. ${entry.purpose}`,
        warning: entry.approvalRequired ? 'Requiere revisión antes de publicación, contacto o mutación.' : 'La ruta existe, pero esta vista no posee una traza reciente atribuible.',
      },
      provider: entry.providerAware ? 'se resuelve durante la ejecución' : null,
      model: entry.providerAware ? 'se resuelve durante la ejecución' : null,
      lastRun: null,
      lastResult: entry.purpose,
      availability: 'gated',
      error: null,
    });
  }

  agents.sort((a, b) => a.role.localeCompare(b.role, 'es'));
  return source(
    { agents },
    'Cognitive Runtime observado + capacidades agentic registradas',
    runtime.eventGraph.warnings,
    runtime.generatedAt,
    runtime.status === 'missing',
  );
}
