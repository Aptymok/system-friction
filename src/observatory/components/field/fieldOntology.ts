export type FieldNodeType = 'sf' | 'module' | 'twin';

export type FieldCommandMode =
  | 'project_manager'
  | 'intervention'
  | 'media'
  | 'calendar'
  | 'social'
  | 'logbook'
  | 'amv'
  | 'mihm'
  | 'asset_eval'
  | 'evidence'
  | 'longitudinal'
  | 'ontology'
  | 'twin';

export type FieldOntologyNode = {
  id: string;
  type: FieldNodeType;
  label: string;
  labelVisible?: string;
  labelInternal?: string;
  visibility?: 'public_surface' | 'operational_module' | 'trace_only';
  surfaceTags?: string[];
  densityLevel?: 'calm' | 'normal' | 'dense' | 'technical';
  description: string;
  commandMode: FieldCommandMode;
  linkedComponents: string[];
  linkedEndpoints: string[];
  linkedSfNodes: string[];
  activationConditions: string[];
  variables?: string[];
  patterns?: string[];
  position: { x: number; y: number };
};

export const sfOntologyNodes: FieldOntologyNode[] = [
  {
    id: 'nodo.sfi.friccion_sistemica',
    type: 'sf',
    label: 'Friccion sistemica',
    description: 'Perdida de senal entre anomalia observada y respuesta verificable.',
    commandMode: 'ontology',
    linkedComponents: ['SfiCognitiveField', 'FieldNodeInspector'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0041', 'SF_P_0060'],
    activationConditions: ['PHI_SF bajo', 'riesgo operativo alto', 'intervencion pendiente'],
    variables: ['senal_detectada', 'respuesta_ejecutada', 'latencia_institucional'],
    patterns: ['desacoplamiento intencion-ejecucion', 'friccion recurrente'],
    position: { x: 0.47, y: 0.46 },
  },
  {
    id: 'nodo.sfi.campo_cognitivo',
    type: 'sf',
    label: 'Campo cognitivo',
    description: 'Infraestructura conceptual que permite observar densidad, gradiente y perturbacion.',
    commandMode: 'ontology',
    linkedComponents: ['SfiCognitiveField'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0002', 'SF_P_0022', 'SF_P_0059'],
    activationConditions: ['senal recibida', 'asset activo', 'continuidad longitudinal'],
    variables: ['densidad_campo', 'gradiente_cognitivo', 'perturbacion_campo'],
    patterns: ['campo semantico compartido', 'perturbacion de contexto'],
    position: { x: 0.37, y: 0.32 },
  },
  {
    id: 'nodo.sfi.latencia',
    type: 'sf',
    label: 'Latencia',
    description: 'Dimension temporal donde una decision pierde valor operativo.',
    commandMode: 'ontology',
    linkedComponents: ['SfiCognitiveField', 'FieldCommandInput'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0014', 'SF_P_0046'],
    activationConditions: ['LDI_hours elevado', 'seguimiento vencido', 'accion no cerrada'],
    variables: ['t_emision', 't_recepcion', 't_procesamiento', 'umbral_latencia'],
    patterns: ['decision diferida', 'demora sin evidencia'],
    position: { x: 0.61, y: 0.56 },
  },
  {
    id: 'nodo.sfi.resonancia_semantica',
    type: 'sf',
    label: 'Resonancia semantica',
    description: 'Amplificacion o degradacion de significado entre nodos que creen hablar de lo mismo.',
    commandMode: 'ontology',
    linkedComponents: ['SfiCognitiveField', 'FieldNodeInspector'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0010', 'SF_P_0029', 'SF_P_0044'],
    activationConditions: ['campo social activo', 'media draft pendiente', 'respuesta externa registrada'],
    variables: ['coherencia_semantica', 'drift_semantico', 'MR'],
    patterns: ['saturacion narrativa', 'friccion perceptual'],
    position: { x: 0.72, y: 0.38 },
  },
];

export const aptymokModuleNodes: FieldOntologyNode[] = [
  {
    id: 'nodo.aptymok.projectmanager',
    type: 'module',
    label: 'Project Manager',
    labelVisible: 'Ruta',
    labelInternal: 'Project Manager',
    visibility: 'operational_module',
    description: 'Convierte intencion en tareas, seguimiento y evidencia verificable.',
    commandMode: 'project_manager',
    linkedComponents: ['FieldCommandInput', 'FieldNodeInspector'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0011', 'SF_P_0022'],
    activationConditions: ['sin asset', 'senal inicial', 'fase SENAL'],
    position: { x: 0.18, y: 0.2 },
  },
  {
    id: 'nodo.aptymok.intervencion',
    type: 'module',
    label: 'Intervencion',
    labelVisible: 'Recuperacion',
    labelInternal: 'Intervencion',
    visibility: 'operational_module',
    description: 'Propone actividad concreta y evidencia requerida.',
    commandMode: 'intervention',
    linkedComponents: ['FieldCommandInput', 'SfiFieldShell'],
    linkedEndpoints: ['/api/liturgia/amv'],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0014', 'SF_P_0060'],
    activationConditions: ['AMV propone actividad', 'riesgo alto', 'fase INTERVENCION'],
    position: { x: 0.28, y: 0.77 },
  },
  {
    id: 'nodo.aptymok.bitacora',
    type: 'module',
    label: 'Bitacora',
    labelVisible: 'Registro',
    labelInternal: 'Bitacora',
    visibility: 'operational_module',
    description: 'Regenera bitacora, fragmentos y public_fragment.',
    commandMode: 'logbook',
    linkedComponents: ['FieldCommandInput', 'Seguimiento'],
    linkedEndpoints: ['/api/bitacora/regenerate'],
    linkedSfNodes: ['SF_P_0059', 'SF_P_0062'],
    activationConditions: ['evento reciente', 'fragmento publico', 'seguimiento activo'],
    position: { x: 0.13, y: 0.55 },
  },
  {
    id: 'nodo.aptymok.media',
    type: 'module',
    label: 'Media',
    labelVisible: 'Pieza',
    labelInternal: 'Media',
    visibility: 'operational_module',
    description: 'Genera, ajusta, aprueba o marca drafts para validacion humana.',
    commandMode: 'media',
    linkedComponents: ['FieldCommandInput', 'Media Room'],
    linkedEndpoints: ['/api/media/drafts'],
    linkedSfNodes: ['SF_P_0010', 'SF_P_0029', 'SF_P_0044'],
    activationConditions: ['eval_asset_active', 'draft pendiente', 'contenido social'],
    position: { x: 0.78, y: 0.78 },
  },
  {
    id: 'nodo.aptymok.calendarizacion',
    type: 'module',
    label: 'Calendarizacion',
    labelVisible: 'Ventana',
    labelInternal: 'Calendarizacion',
    visibility: 'operational_module',
    description: 'Fija ventanas fenomenologicas y proxima observacion.',
    commandMode: 'calendar',
    linkedComponents: ['FieldCommandInput', 'Calendar Surface'],
    linkedEndpoints: ['/api/calendar/phenomenological'],
    linkedSfNodes: ['SF_P_0014', 'SF_P_0046'],
    activationConditions: ['ventana sugerida', 'seguimiento', 'ejecucion pendiente'],
    position: { x: 0.55, y: 0.17 },
  },
  {
    id: 'nodo.aptymok.social_resonance',
    type: 'module',
    label: 'Social Resonance',
    labelVisible: 'Retorno',
    labelInternal: 'Social Resonance',
    visibility: 'operational_module',
    description: 'Registra metricas, comentarios y respuesta del campo social.',
    commandMode: 'social',
    linkedComponents: ['FieldCommandInput', 'Social Field'],
    linkedEndpoints: ['/api/social/resonance'],
    linkedSfNodes: ['SF_P_0029', 'SF_P_0044', 'SF_P_0068'],
    activationConditions: ['resonancia social registrada', 'campo REDES activo'],
    position: { x: 0.91, y: 0.56 },
  },
  {
    id: 'nodo.aptymok.amv',
    type: 'module',
    label: 'AMV',
    labelVisible: 'Lectura',
    labelInternal: 'AMV',
    visibility: 'operational_module',
    description: 'Lectura operacional interna y ajuste posterior a eventos.',
    commandMode: 'amv',
    linkedComponents: ['FieldCommandInput', 'AMV Presence'],
    linkedEndpoints: ['/api/liturgia/amv'],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0011', 'SF_P_0060'],
    activationConditions: ['consulta interna', 'ajuste recomendado', 'actividad propuesta'],
    position: { x: 0.48, y: 0.25 },
  },
  {
    id: 'nodo.aptymok.mihm',
    type: 'module',
    label: 'MIHM',
    labelVisible: 'Estabilidad',
    labelInternal: 'MIHM',
    visibility: 'operational_module',
    description: 'Mide que sostiene o rompe el sistema.',
    commandMode: 'mihm',
    linkedComponents: ['SfiCognitiveField', 'FieldCommandInput'],
    linkedEndpoints: ['/api/mihm', '/api/mihm/process'],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0011', 'SF_P_0060'],
    activationConditions: ['senal activa', 'asset activo', 'riesgo operativo', 'fase ANALISIS'],
    variables: ['IHG', 'NTI', 'LDI', 'ICE', 'CRM', 'F'],
    patterns: ['estabilidad', 'trazabilidad', 'latencia'],
    position: { x: 0.59, y: 0.29 },
  },
  {
    id: 'nodo.aptymok.asset_eval',
    type: 'module',
    label: 'SFI-EVAL-ASSET',
    labelVisible: 'Caso',
    labelInternal: 'SFI-EVAL-ASSET',
    visibility: 'operational_module',
    description: 'Activa evaluacion persistente para contenido, campanas, documentos o evidencia.',
    commandMode: 'asset_eval',
    linkedComponents: ['SfiFieldShell', 'SfiCognitiveField'],
    linkedEndpoints: ['/api/sfi/assets', '/api/sfi/assets/[asset_id]/measurements'],
    linkedSfNodes: ['SF_P_0062', 'SF_P_0068'],
    activationConditions: ['asset activo', 'campania/redes', 'audio', 'imagen', 'video'],
    position: { x: 0.5, y: 0.85 },
  },
  {
    id: 'nodo.aptymok.evidencia',
    type: 'module',
    label: 'Evidencia',
    labelVisible: 'Evidencia',
    labelInternal: 'Evidencia',
    visibility: 'operational_module',
    description: 'Ancla pruebas, archivos, capturas y resultados verificables.',
    commandMode: 'evidence',
    linkedComponents: ['SfiFieldShell', 'FieldCommandInput'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0011'],
    activationConditions: ['archivo adjunto', 'evidencia requerida', 'accion ejecutada'],
    position: { x: 0.18, y: 0.84 },
  },
  {
    id: 'nodo.aptymok.observacion_longitudinal',
    type: 'module',
    label: 'Observacion longitudinal',
    labelVisible: 'Continuidad',
    labelInternal: 'Observacion longitudinal',
    visibility: 'operational_module',
    description: 'Mantiene continuidad, deriva, recurrencia y ajuste del proceso.',
    commandMode: 'longitudinal',
    linkedComponents: ['Seguimiento', 'FieldNodeInspector'],
    linkedEndpoints: ['/api/node/bootstrap'],
    linkedSfNodes: ['SF_P_0059', 'SF_P_0062'],
    activationConditions: ['eventos recurrentes', 'logbook', 'cognitive_event_stream'],
    position: { x: 0.34, y: 0.91 },
  },
];

export const baseTwinNodes: FieldOntologyNode[] = [
  {
    id: 'nodo.usuario.intencion',
    type: 'twin',
    label: 'Intencion',
    description: 'Vector declarado por el usuario al entregar una senal.',
    commandMode: 'twin',
    linkedComponents: ['SfiFieldShell', 'FieldCommandInput'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0011'],
    activationConditions: ['senal escrita', 'objetivo declarado'],
    position: { x: 0.08, y: 0.28 },
  },
  {
    id: 'nodo.usuario.asset_actual',
    type: 'twin',
    label: 'Asset actual',
    description: 'Representacion persistente del objetivo observado.',
    commandMode: 'twin',
    linkedComponents: ['SfiFieldShell'],
    linkedEndpoints: ['/api/sfi/assets'],
    linkedSfNodes: ['SF_P_0062'],
    activationConditions: ['asset activo'],
    position: { x: 0.08, y: 0.72 },
  },
  {
    id: 'nodo.usuario.evidencia',
    type: 'twin',
    label: 'Evidencia',
    description: 'Rastros verificables aportados por el usuario.',
    commandMode: 'twin',
    linkedComponents: ['SfiFieldShell'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0003'],
    activationConditions: ['archivo adjunto', 'medicion creada'],
    position: { x: 0.23, y: 0.91 },
  },
  {
    id: 'nodo.usuario.friccion_recurrente',
    type: 'twin',
    label: 'Friccion recurrente',
    description: 'Patron que reaparece en eventos, bitacora o continuidad.',
    commandMode: 'twin',
    linkedComponents: ['FieldNodeInspector', 'Seguimiento'],
    linkedEndpoints: [],
    linkedSfNodes: ['SF_P_0003', 'SF_P_0059'],
    activationConditions: ['logbook repetido', 'continuidad detectada'],
    position: { x: 0.08, y: 0.48 },
  },
];

export function getDefaultFieldNodes() {
  return [...sfOntologyNodes, ...aptymokModuleNodes, ...baseTwinNodes];
}
