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
  {
    id: 'world_vector_agent',
    name: 'World Vector Agent',
    purpose: 'Integra observación mundial, oportunidades y estado operativo para producir una lectura trazable.',
    layer: 'observe',
    route: '/api/root/agentic/world-vector',
  },
  {
    id: 'moph_agent',
    name: 'MOP-H Agent',
    purpose: 'Interpreta una fricción observada y propone una perturbación mínima reversible sustentada por evidencia.',
    layer: 'reconstruct',
    route: '/api/interface/observatory/interpret',
    providerAware: true,
  },
  {
    id: 'neural_graph_agent',
    name: 'Neural Graph Agent',
    purpose: 'Recupera relaciones y evidencia del grafo persistido sin crear conexiones de respaldo.',
    layer: 'relate',
    route: '/api/root/agentic/neural-graph',
  },
  {
    id: 'amv_agent',
    name: 'AMV Agent',
    purpose: 'Recupera memoria operativa, recurrencias y asociaciones institucionales persistidas.',
    layer: 'remember',
    route: '/api/root/agentic/amv',
  },
  {
    id: 'prediction_agent',
    name: 'Prediction Agent',
    purpose: 'Formula predicciones y probabilidades con base explícita de evidencia e incertidumbre.',
    layer: 'project',
    route: '/api/root/agentic/prediction',
  },
  {
    id: 'client_finder_agent',
    name: 'Client Finder Agent',
    purpose: 'Detecta oportunidades comerciales, ejecuta IFNORM y prepara una propuesta para revisión humana.',
    layer: 'decide',
    route: '/api/root/agentic/client-finder',
    providerAware: true,
    approvalRequired: true,
  },
  {
    id: 'report_agent',
    name: 'Report Agent',
    purpose: 'Genera lecturas institucionales, calibraciones, borradores y reportes sustentados por evidencia.',
    layer: 'report',
    route: '/api/root/agentic/report',
    providerAware: true,
    approvalRequired: true,
  },
];

function registryAgent(entry: (typeof SFI_COGNITIVE_AGENT_REGISTRY)[number]): RootAgent {
  const missingCapability = entry.missingCapability === true;
  const gated = entry.humanApprovalRequired === true;
  const status: RootDataStatus = missingCapability ? 'missing' : gated ? 'gated' : 'observed';
  const availability = missingCapability
    ? 'capability_missing'
    : entry.operationalMode
      ? 'operational'
      : gated
        ? 'registered_gated'
        : 'registered';

  return {
    id: entry.id,
    role: `${entry.name} · ${entry.layer} · ${entry.purpose}`,
    state: {
      value: availability,
      status,
      source: 'SFI_COGNITIVE_AGENT_REGISTRY',
      observedAt: null,
      confidence: null,
      evidenceIds: [],
      explanation: missingCapability
        ? 'El agente está registrado, pero declara una capacidad faltante y no debe presentarse como operativo.'
        : entry.operationalMode
          ? 'El agente está registrado y declarado en modo operativo por el runtime cognitivo.'
          : 'El agente existe en el registro canónico. Su ausencia de ejecución reciente no significa que no exista.',
      warning: missingCapability ? 'Capacidad declarada como faltante.' : gated ? 'Requiere aprobación humana para acciones gobernadas.' : null,
    },
    provider: null,
    model: null,
    lastRun: null,
    lastResult: null,
    availability,
    error: missingCapability ? 'missing_capability' : null,
  };
}

function capabilityAgent(entry: AgenticCapability): RootAgent {
  return {
    id: entry.id,
    role: `${entry.name} · ${entry.layer} · ${entry.purpose}`,
    state: {
      value: entry.approvalRequired ? 'available_gated' : 'available',
      status: entry.approvalRequired ? 'gated' : 'observed',
      source: 'src/lib/agents + authenticated API route',
      observedAt: null,
      confidence: null,
      evidenceIds: [],
      explanation: 'Capacidad agentic implementada en código y expuesta mediante una ruta autenticada. La ejecución y el proveedor se observan por traza, no se inventan en este inventario.',
      warning: entry.approvalRequired ? 'La salida puede requerir revisión humana antes de publicación, contacto o mutación.' : null,
    },
    provider: entry.providerAware ? 'resolved_at_runtime' : null,
    model: entry.providerAware ? 'resolved_at_runtime' : null,
    lastRun: null,
    lastResult: null,
    availability: entry.approvalRequired ? 'available_gated' : 'available',
    error: null,
  };
}

export async function readRootAgents() {
  const byId = new Map<string, RootAgent>();

  for (const entry of SFI_COGNITIVE_AGENT_REGISTRY) {
    byId.set(entry.id, registryAgent(entry));
  }

  for (const entry of AGENTIC_CAPABILITIES) {
    if (!byId.has(entry.id)) byId.set(entry.id, capabilityAgent(entry));
  }

  const agents = [...byId.values()].sort((a, b) => a.role.localeCompare(b.role, 'es'));

  return source(
    { agents },
    'canonical cognitive registry + implemented agentic capabilities',
    [],
    null,
    false,
  );
}
