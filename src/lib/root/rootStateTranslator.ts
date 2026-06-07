export type RootStateSeverity = 'info' | 'notice' | 'warning' | 'critical';

export type RootStateTranslation = {
  rawState: string;
  normalizedState: string;
  label: string;
  explanation: string;
  implication: string;
  recommendedAction: string;
  severity?: RootStateSeverity;
};

const ROOT_STATE_TRANSLATIONS: Record<string, Omit<RootStateTranslation, 'rawState' | 'normalizedState'>> = {
  observed: {
    label: 'Lectura utilizable.',
    explanation: 'El sistema tiene una observacion disponible con origen visible.',
    implication: 'Puede orientar decision si su capa y evidencia sostienen el uso.',
    recommendedAction: 'usar la lectura con su contexto, fecha y fuente visible.',
    severity: 'info',
  },
  partial: {
    label: 'Lectura incompleta.',
    explanation: 'Existe informacion, pero no alcanza para cerrar una decision completa.',
    implication: 'Debe usarse con cautela y no debe presentarse como cierre.',
    recommendedAction: 'reobservar, completar fuente o declarar que falta.',
    severity: 'warning',
  },
  simulated: {
    label: 'Simulacion.',
    explanation: 'No es evidencia real.',
    implication: 'No puede sostener regimen ni atractor.',
    recommendedAction: 'mover a Sandbox o reobservar con fuente real.',
    severity: 'warning',
  },
  queued: {
    label: 'Pendiente sin cierre.',
    explanation: 'Existe, pero todavia no fue ejecutado, cerrado o archivado.',
    implication: 'Empieza a perder fuerza si permanece abierto.',
    recommendedAction: 'cerrar, ejecutar, reobservar o archivar.',
    severity: 'warning',
  },
  degraded: {
    label: 'Perdiendo confiabilidad.',
    explanation: 'La lectura, fuente o elemento muestra perdida de calidad o estabilidad.',
    implication: 'No debe sostener una decision fuerte sin reobservacion.',
    recommendedAction: 'identificar causa, reobservar y usar con cautela.',
    severity: 'warning',
  },
  active: {
    label: 'Vivo.',
    explanation: 'El elemento esta operando ahora o mantiene actividad reciente.',
    implication: 'Puede afectar el estado del campo si pertenece a Observatorio Vivo.',
    recommendedAction: 'observar su efecto y cerrar lo que siga abierto.',
    severity: 'notice',
  },
  stable: {
    label: 'Estable.',
    explanation: 'No muestra tension dominante en la lectura disponible.',
    implication: 'Puede sostener continuidad, pero no debe asumirse permanente.',
    recommendedAction: 'mantener observacion y revisar degradacion por tiempo.',
    severity: 'info',
  },
  critical: {
    label: 'Requiere atencion.',
    explanation: 'El estado indica riesgo alto, bloqueo o degradacion fuerte.',
    implication: 'Debe priorizarse antes de abrir nuevas decisiones.',
    recommendedAction: 'atender causa, reducir riesgo y evitar fortalecer atractor sin evidencia verificable.',
    severity: 'critical',
  },
  vigente: {
    label: 'Vigente.',
    explanation: 'La lectura o evidencia sigue dentro de su ventana util.',
    implication: 'Puede seguir informando decision segun su capa.',
    recommendedAction: 'mantener observacion hasta la proxima relectura.',
    severity: 'info',
  },
  caducado: {
    label: 'Caducado.',
    explanation: 'La lectura o evidencia salio de su ventana util.',
    implication: 'No debe sostener regimen ni decision actual sin reobservacion.',
    recommendedAction: 'archivar o reobservar con fuente actual.',
    severity: 'warning',
  },
  sandbox: {
    label: 'Prueba contenida.',
    explanation: 'El elemento pertenece a prueba, simulacion o experimento no validado.',
    implication: 'No afecta regimen, atractor ni evidencia real.',
    recommendedAction: 'mantener aislado o promover solo despues de observacion real.',
    severity: 'info',
  },
  blocked: {
    label: 'Bloqueado por regla visible.',
    explanation: 'El sistema impide avanzar porque falta evidencia, fase, validacion o aprobacion raiz.',
    implication: 'No debe forzarse sin override justificado.',
    recommendedAction: 'revisar evidencia, fase o autorizacion raiz.',
    severity: 'critical',
  },
  accepted: {
    label: 'Aceptado, no necesariamente ejecutado.',
    explanation: 'La propuesta fue aceptada, pero solo cuenta como cambio real si tiene Accion de Realidad verificada.',
    implication: 'No fortalece atractor por si sola.',
    recommendedAction: 'asociar ejecucion verificable o cerrar como aceptada sin efecto.',
    severity: 'warning',
  },
  proposed: {
    label: 'Propuesta abierta.',
    explanation: 'Hay una posibilidad formulada, todavia sin aceptacion ni ejecucion verificada.',
    implication: 'No es decision ni evidencia externa.',
    recommendedAction: 'aceptar, rechazar, pedir evidencia o dejar caducar con criterio visible.',
    severity: 'notice',
  },
  rejected: {
    label: 'Rechazado o no aceptado.',
    explanation: 'La propuesta o lectura no fue aceptada como direccion actual.',
    implication: 'No debe seguir empujando el campo salvo que aparezca nueva evidencia.',
    recommendedAction: 'archivar decision y registrar aprendizaje si existe.',
    severity: 'info',
  },
  failed: {
    label: 'Fallido, requiere causa.',
    explanation: 'La accion, lectura o agente no logro completar su funcion.',
    implication: 'No debe repetirse sin entender la causa.',
    recommendedAction: 'registrar causa, degradar fuente si aplica y decidir reintento o cierre.',
    severity: 'warning',
  },
  verified: {
    label: 'Verificado con evidencia.',
    explanation: 'Existe evidencia que sostiene el registro o resultado.',
    implication: 'Puede pesar en la lectura segun capa, origen y validacion externa.',
    recommendedAction: 'conservar linaje, fecha, fuente y testigo.',
    severity: 'info',
  },
  pending: {
    label: 'Pendiente.',
    explanation: 'Existe algo por observar, cerrar o ejecutar.',
    implication: 'Puede convertirse en deuda si permanece abierto sin accion.',
    recommendedAction: 'definir siguiente paso, fecha de cierre o archivo.',
    severity: 'warning',
  },
  design_approved: {
    label: 'Diseno aprobado, no ejecutado.',
    explanation: 'La propuesta fue aprobada internamente para preparacion.',
    implication: 'No modifica realidad externa ni fortalece atractor por si sola.',
    recommendedAction: 'asociar Accion de Realidad verificable o mantener como preparacion.',
    severity: 'warning',
  },
  closed: {
    label: 'Cerrado.',
    explanation: 'El registro ya tiene cierre interno.',
    implication: 'El cierre no prueba ejecucion externa salvo que haya evidencia verificable.',
    recommendedAction: 'mantener trazabilidad y revisar si queda aprendizaje o deuda.',
    severity: 'info',
  },
  missing: {
    label: 'Sin lectura suficiente.',
    explanation: 'No hay dato disponible o interpretable para este elemento.',
    implication: 'No debe sostener decision actual.',
    recommendedAction: 'declarar ausencia, buscar fuente o dejar fuera de la lectura.',
    severity: 'warning',
  },
  homeostatic: {
    label: 'Homeostatico.',
    explanation: 'La lectura sugiere integracion o estabilidad relativa del objeto observado.',
    implication: 'Solo sirve si el objeto observado esta declarado.',
    recommendedAction: 'confirmar objeto, fuente y fecha antes de usarla para decision.',
    severity: 'info',
  },
  transition: {
    label: 'En transicion.',
    explanation: 'El sistema no aparece cerrado ni estable; esta cambiando de estado.',
    implication: 'Conviene observar antes de declarar direccion.',
    recommendedAction: 'identificar que cambio, que falta y que debe cerrarse.',
    severity: 'notice',
  },
};

const STATE_ALIASES: Record<string, string> = {
  designapproved: 'design_approved',
  design_approved: 'design_approved',
  approved: 'accepted',
  approval: 'accepted',
  blocked_by_governance: 'blocked',
  block: 'blocked',
  open: 'pending',
  draft: 'proposed',
  prepared: 'queued',
  done: 'closed',
  completed: 'closed',
  complete: 'closed',
  valid: 'verified',
  invalid: 'failed',
  fallback: 'partial',
  derived: 'partial',
  unavailable: 'missing',
  unknown: 'missing',
};

function normalizeState(value: unknown) {
  const raw = typeof value === 'string' && value.trim().length > 0 ? value.trim() : 'missing';
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
  return { raw, normalized: STATE_ALIASES[normalized] ?? normalized };
}

export function translateRootState(value: unknown): RootStateTranslation {
  const { raw, normalized } = normalizeState(value);
  const translation = ROOT_STATE_TRANSLATIONS[normalized] ?? ROOT_STATE_TRANSLATIONS.missing;

  return {
    rawState: raw,
    normalizedState: normalized,
    ...translation,
  };
}

export function isKnownRootState(value: unknown) {
  const { normalized } = normalizeState(value);
  return normalized in ROOT_STATE_TRANSLATIONS;
}

export function listRootStateTranslations() {
  return Object.entries(ROOT_STATE_TRANSLATIONS).map(([state, translation]) => ({
    state,
    ...translation,
  }));
}
