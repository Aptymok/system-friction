import type { GraphMode } from '@/observatory/laboratory/graphModes';

export type WorldSpectCategory =
  | 'factual'
  | 'cultural'
  | 'political'
  | 'social'
  | 'economic'
  | 'technological'
  | 'environmental'
  | 'semantic'
  | 'risk'
  | 'attention';

export type WorldSpectCategoryConfig = {
  id: WorldSpectCategory;
  label: string;
  symbol: string;
  description: string;
  primaryVariables: string[];
  preferredGraphModes: GraphMode[];
  prioritizedSurfaceNodes: string[];
  suppressedSurfaceNodes: string[];
  suggestedProcesses: string[];
};

export const worldSpectCategories: WorldSpectCategoryConfig[] = [
  {
    id: 'factual',
    label: 'Factual',
    symbol: '□F',
    description: 'Prioriza origen, evidencia y consistencia.',
    primaryVariables: ['evidence', 'source', 'origin', 'traceability', 'consistency'],
    preferredGraphModes: ['GPM', 'GCNT'],
    prioritizedSurfaceNodes: ['Evidencia', 'Origen', 'Registro', 'Auditoria', 'Resultado'],
    suppressedSurfaceNodes: ['Presencia'],
    suggestedProcesses: ['verificar origen', 'contrastar evidencia', 'auditar consistencia'],
  },
  {
    id: 'cultural',
    label: 'Cultural',
    symbol: '◌C',
    description: 'Lee recepcion, narrativa y lenguaje compartido.',
    primaryVariables: ['narrative', 'symbol', 'context', 'reception', 'shared_language'],
    preferredGraphModes: ['HGPM', 'GPM'],
    prioritizedSurfaceNodes: ['Pieza', 'Narrativa', 'Presencia', 'Retorno', 'Coherencia'],
    suppressedSurfaceNodes: ['Pruebas'],
    suggestedProcesses: ['ajustar lenguaje', 'encapsular pieza', 'dividir salida'],
  },
  {
    id: 'political',
    label: 'Politico',
    symbol: '⚖P',
    description: 'Delimita poder, competencia y ruta formal.',
    primaryVariables: ['power', 'institution', 'legitimacy', 'conflict', 'regulation'],
    preferredGraphModes: ['HGPM', 'TGPM', 'GCNT'],
    prioritizedSurfaceNodes: ['Marco', 'Competencia', 'Riesgo', 'Coordinacion', 'Evidencia'],
    suppressedSurfaceNodes: ['Pieza'],
    suggestedProcesses: ['delimitar alcance', 'mapear actores', 'definir ruta formal'],
  },
  {
    id: 'social',
    label: 'Social',
    symbol: '◌S',
    description: 'Ordena respuesta, audiencia y coordinacion.',
    primaryVariables: ['audience', 'network', 'coordination', 'response', 'relation'],
    preferredGraphModes: ['HGPM', 'TGPM'],
    prioritizedSurfaceNodes: ['Retorno', 'Coordinacion', 'Presencia', 'Memoria', 'Accion'],
    suppressedSurfaceNodes: ['Arquitectura'],
    suggestedProcesses: ['observar retorno', 'coordinar respuesta', 'esperar señal'],
  },
  {
    id: 'economic',
    label: 'Economico',
    symbol: '◇E',
    description: 'Ubica costo, deuda y sostenibilidad.',
    primaryVariables: ['cost', 'resource', 'debt', 'return', 'sustainability'],
    preferredGraphModes: ['CSCG', 'TGPM'],
    prioritizedSurfaceNodes: ['Accion', 'Ruta', 'Ventana', 'Resultado', 'Riesgo'],
    suppressedSurfaceNodes: ['Narrativa'],
    suggestedProcesses: ['priorizar', 'reducir frente', 'estimar costo de no actuar'],
  },
  {
    id: 'technological',
    label: 'Tecnologico',
    symbol: '⬡T',
    description: 'Revisa infraestructura, dependencia y falla.',
    primaryVariables: ['infrastructure', 'automation', 'dependency', 'failure', 'system_state'],
    preferredGraphModes: ['GPM', 'R_HGN'],
    prioritizedSurfaceNodes: ['Arquitectura', 'Persistencia', 'Pruebas', 'Senal', 'Recuperacion'],
    suppressedSurfaceNodes: ['Presencia'],
    suggestedProcesses: ['validar sistema', 'aislar falla', 'automatizar'],
  },
  {
    id: 'environmental',
    label: 'Ambiental',
    symbol: '🌿A',
    description: 'Ajusta presion externa y tiempo.',
    primaryVariables: ['world', 'environment', 'external_pressure', 'timing'],
    preferredGraphModes: ['TGPM'],
    prioritizedSurfaceNodes: ['Mundo', 'Riesgo', 'Ventana', 'Estado', 'Proyeccion'],
    suppressedSurfaceNodes: ['Repo'],
    suggestedProcesses: ['ajustar ventana', 'esperar', 'registrar presion externa'],
  },
  {
    id: 'semantic',
    label: 'Semantico',
    symbol: '∿L',
    description: 'Reduce ambiguedad, densidad e interpretacion.',
    primaryVariables: ['language', 'intent', 'ambiguity', 'density', 'interpretation'],
    preferredGraphModes: ['GPM', 'GCNT'],
    prioritizedSurfaceNodes: ['Contenido', 'Intencion', 'Coherencia', 'Limite', 'Resultado'],
    suppressedSurfaceNodes: ['Retorno'],
    suggestedProcesses: ['comprimir', 'aclarar intencion', 'separar lectura'],
  },
  {
    id: 'risk',
    label: 'Riesgo',
    symbol: '⚠R',
    description: 'Prioriza exposicion, umbral e irreversibilidad.',
    primaryVariables: ['exposure', 'irreversibility', 'damage', 'threshold'],
    preferredGraphModes: ['CSCG', 'R_HGN'],
    prioritizedSurfaceNodes: ['Riesgo', 'Limite', 'Accion', 'Simulacion', 'Evidencia'],
    suppressedSurfaceNodes: ['Presencia'],
    suggestedProcesses: ['bloquear', 'simular', 'pedir evidencia'],
  },
  {
    id: 'attention',
    label: 'Atencion',
    symbol: '◉A',
    description: 'Reduce carga y elige una ventana limpia.',
    primaryVariables: ['attention', 'saturation', 'cognitive_load', 'window'],
    preferredGraphModes: ['SONG'],
    prioritizedSurfaceNodes: ['Carga', 'Ventana', 'Memoria', 'Accion', 'Nodo Vivo'],
    suppressedSurfaceNodes: ['Pruebas', 'Repo', 'Arquitectura'],
    suggestedProcesses: ['reducir densidad', 'esperar', 'ejecutar una accion minima'],
  },
];

export function getWorldSpectCategoryConfig(id: WorldSpectCategory) {
  return worldSpectCategories.find((category) => category.id === id) || worldSpectCategories[0];
}
