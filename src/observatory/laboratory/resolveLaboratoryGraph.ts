import type { IntentProfile } from '@/observatory/surface/fieldSurfaceRouter';
import type { GraphMode } from './graphModes';
import { getVisibleLaboratoryClusters, laboratoryClusters, normalizeClusterLabel } from './laboratoryClusters';
import type { LaboratoryClusterColor, LaboratoryClusterShape } from './laboratoryClusters';

export type LaboratoryCluster =
  | 'Nodo Vivo'
  | 'Auditoria'
  | 'Simulacion'
  | 'Resultado'
  | 'Accion'
  | 'Memoria'
  | 'Mundo'
  | 'Presencia'
  | 'Ventana';

export type LaboratoryGraphNode = {
  id: string;
  label: string;
  cluster: LaboratoryCluster | string;
  ring: 0 | 1 | 2;
  shape: LaboratoryClusterShape;
  color: LaboratoryClusterColor;
  weight: number;
  kind?: 'core' | 'cluster' | 'process' | 'emergent_unlinked' | 'emergent_candidate' | 'suggested_connection';
  parentId?: string;
};

export type LaboratoryGraphEdge = {
  from: string;
  to: string;
  strength: number;
  dashed?: boolean;
};

export type LaboratoryGraphState = {
  nodes: LaboratoryGraphNode[];
  edges: LaboratoryGraphEdge[];
  graphMode: GraphMode;
  graphModes: GraphMode[];
  activeStep: 'Auditoria' | 'Simulacion' | 'Resultado' | 'Accion';
  floatingEmergents: LaboratoryGraphNode[];
  hiddenModules: string[];
};

function clusterFromIntent(intentProfile?: IntentProfile | string | null): LaboratoryCluster {
  if (intentProfile === 'social_publication') return 'Presencia';
  if (intentProfile === 'content_audit' || intentProfile === 'institutional_review' || intentProfile === 'system_audit') return 'Auditoria';
  if (intentProfile === 'world_observation') return 'Mundo';
  if (intentProfile === 'memory_continuity') return 'Memoria';
  if (intentProfile === 'enterprise_diagnosis') return 'Simulacion';
  if (intentProfile === 'low_friction_route') return 'Accion';
  return 'Nodo Vivo';
}

export function resolveGraphModeForProcess(intentProfile?: string | null, clusterId?: string | null, command?: string, cognitiveTwinUxState?: Record<string, unknown> | null): GraphMode[] {
  const communicationProfile = cognitiveTwinUxState?.communicationProfile as Record<string, unknown> | undefined;
  const overloadCount = Number(communicationProfile?.overloadDetectedCount || 0);
  const text = `${intentProfile || ''} ${clusterId || ''} ${command || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (overloadCount > 1 || /saturado|no entiendo|carga|demasiado/.test(text)) return ['SONG'];
  if (/decidir|decision|dos rutas|criterio/.test(text)) return ['CSCG', 'GCNT'];
  if (/empresa|crisis|latencia|coordinacion|sistemico/.test(text)) return ['HGPM', 'TGPM'];
  if (/auditar|texto|origen|contenido|coherencia/.test(text)) return ['GPM'];
  if (/ejecutar|accion|cerrar|terminado/.test(text)) return ['R_HGN'];
  if (/redisenar|optimizar|arquitectura|reorganizar/.test(text)) return ['NGE'];
  return ['GPM'];
}

export function resolveLaboratoryGraph(input: {
  intentProfile?: IntentProfile | string | null;
  activeCluster?: string | null;
  activeProcess?: string | null;
  cognitiveTwinUxState?: Record<string, unknown> | null;
  command?: string;
}): LaboratoryGraphState {
  const activeCluster = normalizeClusterLabel(input.activeCluster || clusterFromIntent(input.intentProfile)) as LaboratoryCluster;
  const visibleClusters = getVisibleLaboratoryClusters({
    intentProfile: input.intentProfile,
    command: input.command,
    activeCluster,
  });
  const activeClusterConfig = visibleClusters.find((cluster) => cluster.label === activeCluster)
    || laboratoryClusters.find((cluster) => cluster.label === activeCluster)
    || laboratoryClusters[0];
  const modes = resolveGraphModeForProcess(input.intentProfile || null, activeClusterConfig.id, input.command, input.cognitiveTwinUxState);

  const clusterNodes: LaboratoryGraphNode[] = visibleClusters.map((cluster) => ({
    id: `cluster-${cluster.id}`,
    label: cluster.label,
    cluster: cluster.label,
    ring: 1,
    shape: cluster.shape,
    color: cluster.color,
    kind: 'cluster',
    weight: cluster.label === activeClusterConfig.label ? 1 : 0.5,
  }));

  const parentClusterNode = clusterNodes.find((cluster) => cluster.label === activeClusterConfig.label) || clusterNodes[0];
  const processNodes: LaboratoryGraphNode[] = activeClusterConfig.processes.map((label, index) => ({
    id: `process-${activeClusterConfig.id}-${index}`,
    label,
    cluster: activeClusterConfig.label,
    ring: 2,
    shape: 'circle',
    color: activeClusterConfig.color === 'blue' || activeClusterConfig.color === 'purple' || activeClusterConfig.color === 'red'
      ? activeClusterConfig.color
      : 'gold',
    kind: 'process',
    parentId: parentClusterNode?.id,
    weight: input.activeProcess === label ? 1 : 0.68,
  }));

  const center: LaboratoryGraphNode = {
    id: 'center',
    label: 'Nodo Vivo',
    cluster: 'Nodo Vivo',
    ring: 0,
    shape: 'double-circle',
    color: 'gold',
    kind: 'core',
    weight: 1,
  };

  const edges: LaboratoryGraphEdge[] = [
    ...clusterNodes.map((node) => ({
      from: 'center',
      to: node.id,
      strength: node.label === activeClusterConfig.label ? 1 : 0.34,
    })),
    ...processNodes.map((node) => ({
      from: parentClusterNode?.id || 'center',
      to: node.id,
      strength: input.activeProcess === node.label ? 0.95 : 0.7,
    })),
  ];

  const activeStep = activeClusterConfig.label === 'Simulacion'
    ? 'Simulacion'
    : activeClusterConfig.label === 'Resultado'
      ? 'Resultado'
      : activeClusterConfig.label === 'Accion' || activeClusterConfig.label === 'Ventana'
        ? 'Accion'
        : 'Auditoria';

  return {
    nodes: [center, ...clusterNodes, ...processNodes],
    edges,
    graphMode: modes[0],
    graphModes: Array.from(new Set([...modes, ...activeClusterConfig.graphModes])),
    activeStep,
    floatingEmergents: [],
    hiddenModules: ['ruta', 'retorno', 'pieza', 'caso'],
  };
}
