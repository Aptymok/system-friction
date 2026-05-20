import type { IntentProfile } from '@/observatory/surface/fieldSurfaceRouter';
import type { GraphMode } from './graphModes';

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
  shape: 'double-circle' | 'hexagon' | 'triangle' | 'diamond' | 'square' | 'circle' | 'ring' | 'star' | 'rounded-square';
  color: 'gold' | 'blue' | 'purple' | 'green' | 'amber' | 'teal' | 'red';
  weight: number;
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

const clusters: Array<Omit<LaboratoryGraphNode, 'ring' | 'weight'>> = [
  { id: 'cluster-live', label: 'Nodo Vivo', cluster: 'Nodo Vivo', shape: 'double-circle', color: 'gold' },
  { id: 'cluster-audit', label: 'Auditoria', cluster: 'Auditoria', shape: 'hexagon', color: 'blue' },
  { id: 'cluster-simulation', label: 'Simulacion', cluster: 'Simulacion', shape: 'triangle', color: 'purple' },
  { id: 'cluster-result', label: 'Resultado', cluster: 'Resultado', shape: 'diamond', color: 'green' },
  { id: 'cluster-action', label: 'Accion', cluster: 'Accion', shape: 'square', color: 'amber' },
  { id: 'cluster-memory', label: 'Memoria', cluster: 'Memoria', shape: 'circle', color: 'teal' },
  { id: 'cluster-world', label: 'Mundo', cluster: 'Mundo', shape: 'ring', color: 'teal' },
  { id: 'cluster-presence', label: 'Presencia', cluster: 'Presencia', shape: 'star', color: 'red' },
  { id: 'cluster-window', label: 'Ventana', cluster: 'Ventana', shape: 'rounded-square', color: 'amber' },
];

const processByCluster: Record<string, string[]> = {
  'Nodo Vivo': ['calibrar nodo', 'reducir carga', 'nombrar recurrencia'],
  Auditoria: ['auditar sin generar', 'verificar origen', 'separar riesgo'],
  Simulacion: ['comparar rutas', 'simular demora', 'probar reversibilidad'],
  Resultado: ['sintetizar lectura', 'separar evidencia', 'cerrar conclusion'],
  Accion: ['definir accion', 'pedir evidencia', 'cerrar siguiente paso'],
  Memoria: ['guardar pendiente', 'ver continuidad', 'abrir origen'],
  Mundo: ['leer medicion', 'seleccionar lente', 'ajustar ventana'],
  Presencia: ['preparar publicacion', 'auditar pieza', 'observar retorno'],
  Ventana: ['fijar observacion', 'esperar señal', 'revisar hora'],
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

function graphModeFor(input: { intentProfile?: string; command?: string; activeCluster?: string }): GraphMode[] {
  const text = `${input.intentProfile || ''} ${input.command || ''} ${input.activeCluster || ''}`.toLowerCase();
  if (/saturado|no entiendo|carga/.test(text)) return ['SONG'];
  if (/decidir|decision|riesgo/.test(text)) return ['CSCG', 'GCNT'];
  if (/empresa|crisis|latencia|temporal/.test(text)) return ['HGPM', 'TGPM'];
  if (/auditar|texto|origen|contenido/.test(text)) return ['GPM'];
  if (/ejecutar|accion/.test(text)) return ['R_HGN'];
  if (/rediseñar|redisenar|arquitectura/.test(text)) return ['NGE'];
  return ['GPM'];
}

export function resolveLaboratoryGraph(input: {
  intentProfile?: IntentProfile | string | null;
  activeCluster?: string | null;
  activeProcess?: string | null;
  cognitiveTwinUxState?: Record<string, unknown> | null;
  command?: string;
}): LaboratoryGraphState {
  const activeCluster = input.activeCluster || clusterFromIntent(input.intentProfile);
  const modes = graphModeFor({ intentProfile: input.intentProfile || undefined, command: input.command, activeCluster });
  const nodes: LaboratoryGraphNode[] = clusters.map((cluster) => ({
    ...cluster,
    ring: 1,
    weight: cluster.label === activeCluster ? 1 : 0.62,
  }));
  const processNodes: LaboratoryGraphNode[] = (processByCluster[activeCluster] || []).map((label, index) => ({
    id: `process-${activeCluster.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
    label,
    cluster: activeCluster,
    ring: 2,
    shape: 'circle',
    color: activeCluster === 'Presencia' ? 'red' : activeCluster === 'Simulacion' ? 'purple' : 'gold',
    weight: input.activeProcess === label ? 1 : 0.7,
  }));
  const center: LaboratoryGraphNode = {
    id: 'center',
    label: 'Nodo Vivo',
    cluster: 'Nodo Vivo',
    ring: 0,
    shape: 'double-circle',
    color: 'gold',
    weight: 1,
  };
  const edges: LaboratoryGraphEdge[] = [
    ...nodes.map((node) => ({ from: 'center', to: node.id, strength: node.label === activeCluster ? 0.95 : 0.42 })),
    ...processNodes.map((node) => ({ from: nodes.find((cluster) => cluster.label === activeCluster)?.id || 'center', to: node.id, strength: 0.74 })),
  ];
  const activeStep = activeCluster === 'Simulacion'
    ? 'Simulacion'
    : activeCluster === 'Resultado'
      ? 'Resultado'
      : activeCluster === 'Accion' || activeCluster === 'Ventana'
        ? 'Accion'
        : 'Auditoria';
  return {
    nodes: [center, ...nodes, ...processNodes],
    edges,
    graphMode: modes[0],
    graphModes: modes,
    activeStep,
    floatingEmergents: [],
    hiddenModules: ['ruta', 'retorno', 'pieza', 'caso'],
  };
}
