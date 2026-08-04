import 'server-only';

import { SFI_COGNITIVE_AGENT_REGISTRY } from '@/lib/sfi/cognitive-runtime/registry';
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

function registryAgent(entry: (typeof SFI_COGNITIVE_AGENT_REGISTRY)[number]): RootAgent {
  const missingCapability = entry.missingCapability === true;
  const gated = entry.humanApprovalRequired === true;
  const status: RootDataStatus = missingCapability ? 'missing' : gated ? 'gated' : 'observed';
  const availability = missingCapability
    ? 'capacidad faltante'
    : entry.operationalMode
      ? 'operativo'
      : gated
        ? 'registrado · requiere autorización'
        : 'registrado';

  return {
    id: entry.id,
    role: entry.name,
    state: {
      value: availability,
      status,
      source: 'Registro cognitivo canónico de SFI',
      observedAt: null,
      confidence: null,
      evidenceIds: [],
      explanation: missingCapability
        ? `Capa ${entry.layer}. El agente está registrado, pero declara una capacidad faltante.`
        : entry.operationalMode
          ? `Capa ${entry.layer}. El runtime lo declara en modo operativo.`
          : `Capa ${entry.layer}. El agente existe en el registro canónico; no tener una ejecución reciente no significa que no exista.`,
      warning: missingCapability ? 'Capacidad declarada como faltante.' : gated ? 'Requiere autorización humana para acciones gobernadas.' : null,
    },
    provider: null,
    model: null,
    lastRun: null,
    lastResult: entry.purpose,
    availability,
    error: missingCapability ? 'Capacidad faltante' : null,
  };
}

function capabilityAgent(entry: AgenticCapability): RootAgent {
  const availability = entry.approvalRequired ? 'disponible · requiere autorización' : 'disponible';
  return {
    id: entry.id,
    role: entry.name,
    state: {
      value: availability,
      status: entry.approvalRequired ? 'gated' : 'observed',
      source: 'Capacidad agentic implementada y ruta autenticada',
      observedAt: null,
      confidence: null,
      evidenceIds: [],
      explanation: `Capa ${entry.layer}. La capacidad está implementada. La última ejecución y el proveedor sólo deben mostrarse cuando exista una traza real.`,
      warning: entry.approvalRequired ? 'La salida requiere revisión antes de publicación, contacto o mutación.' : null,
    },
    provider: entry.providerAware ? 'Se resuelve durante la ejecución' : null,
    model: entry.providerAware ? 'Se resuelve durante la ejecución' : null,
    lastRun: null,
    lastResult: entry.purpose,
    availability,
    error: null,
  };
}

export async function readRootAgents() {
  const byId = new Map<string, RootAgent>();

  for (const entry of SFI_COGNITIVE_AGENT_REGISTRY) byId.set(entry.id, registryAgent(entry));
  for (const entry of AGENTIC_CAPABILITIES) if (!byId.has(entry.id)) byId.set(entry.id, capabilityAgent(entry));

  const agents = [...byId.values()].sort((a, b) => a.role.localeCompare(b.role, 'es'));

  return source(
    { agents },
    'Registro cognitivo canónico + capacidades agentic implementadas',
    [],
    null,
    false,
  );
}
