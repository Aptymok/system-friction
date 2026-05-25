import type { IntentProfile } from '@/observatory/surface/fieldSurfaceRouter';
import type { GraphMode } from './graphModes';

export type LaboratoryClusterId =
  | 'cognitive_twin'
  | 'audit'
  | 'simulation'
  | 'result'
  | 'action'
  | 'memory'
  | 'world'
  | 'presence'
  | 'calendar';

export type LaboratoryClusterShape =
  | 'double-circle'
  | 'hexagon'
  | 'triangle'
  | 'diamond'
  | 'square'
  | 'circle'
  | 'ring'
  | 'star'
  | 'rounded-square';

export type LaboratoryClusterColor = 'gold' | 'blue' | 'purple' | 'green' | 'amber' | 'teal' | 'red';

export type LaboratoryCluster = {
  id: LaboratoryClusterId;
  label: string;
  internalModule: string;
  color: LaboratoryClusterColor;
  shape: LaboratoryClusterShape;
  ring: 1;
  enabledWhen: 'always' | 'intent' | 'licensed';
  processes: string[];
  graphModes: GraphMode[];
};

export const laboratoryClusters: LaboratoryCluster[] = [
  {
    id: 'cognitive_twin',
    label: 'Nodo Vivo',
    internalModule: 'cognitive_twin',
    color: 'gold',
    shape: 'double-circle',
    ring: 1,
    enabledWhen: 'always',
    processes: ['calibrar nodo', 'revisar patron', 'ajustar densidad', 'cambiar modo'],
    graphModes: ['SONG'],
  },
  {
    id: 'audit',
    label: 'Auditoria',
    internalModule: 'audit',
    color: 'blue',
    shape: 'hexagon',
    ring: 1,
    enabledWhen: 'always',
    processes: ['auditar texto', 'auditar archivo', 'auditar sistema', 'auditar intencion'],
    graphModes: ['GPM', 'GCNT'],
  },
  {
    id: 'simulation',
    label: 'Simulacion',
    internalModule: 'simulation',
    color: 'purple',
    shape: 'triangle',
    ring: 1,
    enabledWhen: 'always',
    processes: ['simular consecuencia', 'comparar rutas', 'proyectar escenario', 'evaluar riesgo'],
    graphModes: ['CSCG'],
  },
  {
    id: 'result',
    label: 'Resultado',
    internalModule: 'result',
    color: 'green',
    shape: 'diamond',
    ring: 1,
    enabledWhen: 'always',
    processes: ['sintetizar lectura', 'extraer patron', 'declarar limite', 'preparar decision'],
    graphModes: ['GPM'],
  },
  {
    id: 'action',
    label: 'Accion',
    internalModule: 'action',
    color: 'amber',
    shape: 'square',
    ring: 1,
    enabledWhen: 'always',
    processes: ['crear siguiente accion', 'verificar avance', 'cerrar ciclo', 'criterio de terminado'],
    graphModes: ['R_HGN'],
  },
  {
    id: 'memory',
    label: 'Memoria',
    internalModule: 'longitudinal_memory',
    color: 'teal',
    shape: 'circle',
    ring: 1,
    enabledWhen: 'always',
    processes: ['revisar recurrencia', 'recuperar pendiente', 'comparar ciclos', 'registrar continuidad'],
    graphModes: ['TGPM'],
  },
  {
    id: 'world',
    label: 'Mundo',
    internalModule: 'worldspect_reference',
    color: 'teal',
    shape: 'ring',
    ring: 1,
    enabledWhen: 'always',
    processes: ['leer estado global', 'comparar contra objetivo', 'usar medicion vigente'],
    graphModes: ['TGPM'],
  },
  {
    id: 'presence',
    label: 'Presencia',
    internalModule: 'presence',
    color: 'red',
    shape: 'star',
    ring: 1,
    enabledWhen: 'intent',
    processes: ['preparar pieza', 'revisar riesgo', 'registrar publicacion manual', 'capturar retorno'],
    graphModes: ['HGPM', 'TGPM'],
  },
  {
    id: 'calendar',
    label: 'Ventana',
    internalModule: 'calendar',
    color: 'amber',
    shape: 'rounded-square',
    ring: 1,
    enabledWhen: 'intent',
    processes: ['crear hito', 'mover fecha', 'revisar bloqueo', 'cerrar accion'],
    graphModes: ['TGPM', 'R_HGN'],
  },
];

export function normalizeClusterLabel(label?: string | null) {
  if (!label) return 'Nodo Vivo';
  const lower = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return laboratoryClusters.find((cluster) => cluster.label.toLowerCase() === lower || cluster.id === lower)?.label || label;
}

export function shouldRevealIntentCluster(cluster: LaboratoryCluster, input: {
  intentProfile?: IntentProfile | string | null;
  command?: string;
  activeCluster?: string | null;
}) {
  if (cluster.enabledWhen === 'always') return true;
  const text = `${input.intentProfile || ''} ${input.command || ''} ${input.activeCluster || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (cluster.id === 'presence') return /social_publication|publicar|pieza|post|contenido|presencia|redes/.test(text);
  if (cluster.id === 'calendar') return /calendar|ventana|fecha|hora|deadline|hito|proyecto|accion|ejecutar/.test(text);
  return false;
}

export function getVisibleLaboratoryClusters(input: {
  intentProfile?: IntentProfile | string | null;
  command?: string;
  activeCluster?: string | null;
}) {
  return laboratoryClusters.filter((cluster) => shouldRevealIntentCluster(cluster, input));
}
