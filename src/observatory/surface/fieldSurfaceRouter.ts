export type IntentProfile =
  | 'personal_clarity'
  | 'memory_continuity'
  | 'content_audit'
  | 'low_friction_route'
  | 'social_publication'
  | 'world_observation'
  | 'enterprise_diagnosis'
  | 'institutional_review'
  | 'system_audit';

export type CognitiveDensity = 'calm' | 'normal' | 'dense' | 'technical';

export type FieldSurface = {
  id: string;
  intentProfile: IntentProfile;
  density: CognitiveDensity;
  visibleNodeIds: string[];
  allowedCommandModes: string[];
  hiddenCommandModes: string[];
  primaryPrompt: string;
  responseStyle: 'direct' | 'structured' | 'technical';
  requiresAccountFor: string[];
};

type ResolveFieldSurfaceInput = {
  sfi_local_node?: Record<string, any> | null;
  currentCommand?: string;
  selectedFieldMode?: string;
  cognitiveTwinUxState?: Record<string, any> | null;
  activeAssetKind?: string | null;
};

const surfaces: Record<IntentProfile, FieldSurface> = {
  personal_clarity: {
    id: 'surface.personal_clarity',
    intentProfile: 'personal_clarity',
    density: 'calm',
    visibleNodeIds: ['surface.estado', 'surface.hecho', 'surface.repeticion', 'surface.carga', 'surface.siguiente_paso'],
    allowedCommandModes: ['twin', 'mihm', 'evidence', 'longitudinal', 'intervention', 'amv'],
    hiddenCommandModes: ['social', 'media', 'asset_eval', 'calendar'],
    primaryPrompt: 'Que necesitas observar?',
    responseStyle: 'direct',
    requiresAccountFor: ['memoria longitudinal', 'historial persistente'],
  },
  memory_continuity: {
    id: 'surface.memory_continuity',
    intentProfile: 'memory_continuity',
    density: 'normal',
    visibleNodeIds: ['surface.registro', 'surface.continuidad', 'surface.pendiente', 'surface.origen', 'surface.evidencia'],
    allowedCommandModes: ['logbook', 'longitudinal', 'evidence', 'amv'],
    hiddenCommandModes: ['social', 'media', 'asset_eval'],
    primaryPrompt: 'Que debe conservarse?',
    responseStyle: 'structured',
    requiresAccountFor: ['guardar nodo', 'activar memoria', 'conservar historial'],
  },
  content_audit: {
    id: 'surface.content_audit',
    intentProfile: 'content_audit',
    density: 'normal',
    visibleNodeIds: ['surface.contenido', 'surface.origen', 'surface.riesgo', 'surface.coherencia', 'surface.limite'],
    allowedCommandModes: ['media', 'mihm', 'evidence', 'amv'],
    hiddenCommandModes: ['social'],
    primaryPrompt: 'Que pieza quieres auditar?',
    responseStyle: 'structured',
    requiresAccountFor: ['subir archivo completo', 'guardar evidencia'],
  },
  low_friction_route: {
    id: 'surface.low_friction_route',
    intentProfile: 'low_friction_route',
    density: 'normal',
    visibleNodeIds: ['surface.ruta', 'surface.estado', 'surface.latencia', 'surface.evidencia', 'surface.siguiente_paso'],
    allowedCommandModes: ['project_manager', 'mihm', 'evidence', 'intervention'],
    hiddenCommandModes: ['social', 'media'],
    primaryPrompt: 'Que accion minima quieres cerrar?',
    responseStyle: 'direct',
    requiresAccountFor: ['ejecutar acciones verificables', 'crear multiples proyectos'],
  },
  social_publication: {
    id: 'surface.social_publication',
    intentProfile: 'social_publication',
    density: 'dense',
    visibleNodeIds: ['surface.pieza', 'surface.intencion', 'surface.mundo', 'surface.ventana', 'surface.retorno'],
    allowedCommandModes: ['media', 'mihm', 'calendar', 'social', 'evidence'],
    hiddenCommandModes: ['asset_eval'],
    primaryPrompt: 'Que pieza podria salir?',
    responseStyle: 'structured',
    requiresAccountFor: ['subir archivo completo', 'usar redes sociales', 'conectar fuentes'],
  },
  world_observation: {
    id: 'surface.world_observation',
    intentProfile: 'world_observation',
    density: 'calm',
    visibleNodeIds: ['surface.mundo', 'surface.tono', 'surface.ruido', 'surface.presion', 'surface.pulso'],
    allowedCommandModes: ['ontology', 'amv'],
    hiddenCommandModes: ['social', 'media', 'project_manager'],
    primaryPrompt: 'Que contexto quieres contrastar?',
    responseStyle: 'direct',
    requiresAccountFor: ['conectar fuentes', 'calendario'],
  },
  enterprise_diagnosis: {
    id: 'surface.enterprise_diagnosis',
    intentProfile: 'enterprise_diagnosis',
    density: 'dense',
    visibleNodeIds: ['surface.friccion', 'surface.latencia', 'surface.senal', 'surface.responsabilidad', 'surface.recuperacion'].filter(Boolean),
    allowedCommandModes: ['mihm', 'evidence', 'intervention', 'project_manager'],
    hiddenCommandModes: ['social', 'media'],
    primaryPrompt: 'Que sistema esta en riesgo?',
    responseStyle: 'structured',
    requiresAccountFor: ['diagnostico longitudinal', 'subir archivo completo'],
  },
  institutional_review: {
    id: 'surface.institutional_review',
    intentProfile: 'institutional_review',
    density: 'dense',
    visibleNodeIds: ['surface.marco', 'surface.evidencia', 'surface.competencia', 'surface.riesgo', 'surface.ruta'],
    allowedCommandModes: ['ontology', 'evidence', 'mihm', 'project_manager'],
    hiddenCommandModes: ['social', 'media'],
    primaryPrompt: 'Que marco debe revisarse?',
    responseStyle: 'structured',
    requiresAccountFor: ['reporte formal', 'memoria longitudinal'],
  },
  system_audit: {
    id: 'surface.system_audit',
    intentProfile: 'system_audit',
    density: 'technical',
    visibleNodeIds: ['surface.arquitectura', 'surface.repo', 'surface.persistencia', 'surface.limite', 'surface.pruebas'],
    allowedCommandModes: ['ontology', 'evidence', 'logbook', 'mihm'],
    hiddenCommandModes: ['social', 'media'],
    primaryPrompt: 'Que parte del sistema quieres auditar?',
    responseStyle: 'technical',
    requiresAccountFor: ['pruebas persistentes', 'historial tecnico'],
  },
};

function normalize(input = '') {
  return input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function inferIntentProfile(text = '', localNode?: Record<string, any> | null): IntentProfile {
  const source = normalize(`${text} ${localNode?.declaredObjective || ''} ${localNode?.advancementLoop || ''}`);
  if (/(cimps|repo|arquitectura|persistencia|pruebas|sistema vs)/.test(source)) return 'system_audit';
  if (/(inegi|norma|publica|institucion|marco|competencia)/.test(source)) return 'institutional_review';
  if (/(empresa|organizacion|tronar|colapso|operacion|latencia)/.test(source)) return 'enterprise_diagnosis';
  if (/(mundo|hoy|contexto|tono|ruido|presion)/.test(source)) return 'world_observation';
  if (/(publicar|subir|pieza|post|redes|presencia|contenido)/.test(source)) return 'social_publication';
  if (/(audita|auditar|texto|reescribir|origen|coherencia)/.test(source)) return 'content_audit';
  if (/(recordar|pendiente|continuidad|memoria|quedo)/.test(source)) return 'memory_continuity';
  if (/(ejecutar|accion|ruta|decidir|siguiente)/.test(source)) return 'low_friction_route';
  return 'personal_clarity';
}

export function resolveFieldSurface(input: ResolveFieldSurfaceInput): FieldSurface {
  const intentProfile = inferIntentProfile(input.currentCommand, input.sfi_local_node);
  const base = surfaces[intentProfile];
  if (input.selectedFieldMode === 'CT' && intentProfile === 'personal_clarity') {
    return { ...base, density: 'calm' };
  }
  return base;
}
