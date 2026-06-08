export const AMV_FOCUS_VARIABLES = [
  'cultural',
  'ritmo',
  'genero',
  'dolencia_social',
  'letra',
  'densidad_emocional',
  'energia_corporal',
  'friccion_institucional',
  'latencia',
  'deuda',
  'protoatractor',
  'eyector',
  'riesgo',
  'ejecucion',
] as const

export type AmvFocusVariable = (typeof AMV_FOCUS_VARIABLES)[number]

export type AmvFocusVariableDefinition = {
  id: AmvFocusVariable
  label: string
  observes: string
  routeChangeHint: string
}

export const AMV_FOCUS_VARIABLE_DEFINITIONS: Record<AmvFocusVariable, AmvFocusVariableDefinition> = {
  cultural: {
    id: 'cultural',
    label: 'Cultural',
    observes: 'Senales de campo cultural, recepcion, friccion simbolica o posicionamiento.',
    routeChangeHint: 'Cambia ruta si altera audiencia, evidencia externa o contexto de publicacion.',
  },
  ritmo: {
    id: 'ritmo',
    label: 'Ritmo',
    observes: 'Velocidad, pulso, cadencia de ejecucion o lectura temporal.',
    routeChangeHint: 'Cambia ruta si la velocidad vuelve inviable el cierre o exige pausa.',
  },
  genero: {
    id: 'genero',
    label: 'Genero',
    observes: 'Familia estetica, formato o clase cultural declarada.',
    routeChangeHint: 'Cambia ruta si modifica objeto observado, canal o expectativa de evidencia.',
  },
  dolencia_social: {
    id: 'dolencia_social',
    label: 'Dolencia social',
    observes: 'Dolor colectivo, tension publica o friccion social recurrente.',
    routeChangeHint: 'Cambia ruta si eleva riesgo institucional, comunicacional o de exposicion.',
  },
  letra: {
    id: 'letra',
    label: 'Letra',
    observes: 'Lenguaje, tema, densidad semantica y marcas narrativas.',
    routeChangeHint: 'Cambia ruta si el texto modifica fenomeno, evidencia o riesgo de interpretacion.',
  },
  densidad_emocional: {
    id: 'densidad_emocional',
    label: 'Densidad emocional',
    observes: 'Carga afectiva y saturacion expresiva del objeto observado.',
    routeChangeHint: 'Cambia ruta si aumenta riesgo, cierre o necesidad de reobservacion.',
  },
  energia_corporal: {
    id: 'energia_corporal',
    label: 'Energia corporal',
    observes: 'Intensidad fisica, impedimento, activacion o fatiga declarada.',
    routeChangeHint: 'Cambia ruta si bloquea una accion de realidad o ejecucion verificable.',
  },
  friccion_institucional: {
    id: 'friccion_institucional',
    label: 'Friccion institucional',
    observes: 'Bloqueos, reglas, deuda administrativa o resistencia institucional.',
    routeChangeHint: 'Cambia ruta si requiere aprobacion, evidencia fuerte o congelamiento.',
  },
  latencia: {
    id: 'latencia',
    label: 'Latencia',
    observes: 'Demora entre senal, decision, ejecucion y cierre.',
    routeChangeHint: 'Cambia ruta si convierte propuesta, mutacion o accion en pendiente critico.',
  },
  deuda: {
    id: 'deuda',
    label: 'Deuda',
    observes: 'Distancia entre decision aceptada y accion verificada.',
    routeChangeHint: 'Cambia ruta si debilita atractor o restringe nuevas intenciones.',
  },
  protoatractor: {
    id: 'protoatractor',
    label: 'Protoatractor',
    observes: 'Direccion emergente aun sin evidencia suficiente para atractor.',
    routeChangeHint: 'Cambia ruta si pasa de senal candidata a direccion sostenida.',
  },
  eyector: {
    id: 'eyector',
    label: 'Eyector',
    observes: 'Elemento que expulsa energia, contamina direccion o desviau cierre.',
    routeChangeHint: 'Cambia ruta si exige cierre, aislamiento o congelamiento.',
  },
  riesgo: {
    id: 'riesgo',
    label: 'Riesgo',
    observes: 'Probabilidad de dano operacional, epistemico o institucional.',
    routeChangeHint: 'Cambia ruta si sube a high o hard_stop.',
  },
  ejecucion: {
    id: 'ejecucion',
    label: 'Ejecucion',
    observes: 'Accion real preparada, ejecutada, bloqueada o verificada.',
    routeChangeHint: 'Cambia ruta si existe o falta accion verificable.',
  },
}

export function isAmvFocusVariable(value: unknown): value is AmvFocusVariable {
  return typeof value === 'string' && AMV_FOCUS_VARIABLES.includes(value as AmvFocusVariable)
}
