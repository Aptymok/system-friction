export const AMV_REPORT_REGIMES = [
  'contemplative',
  'performative',
  'saturated',
  'proto_critical',
  'dissonant',
  'extractive',
  'ghost',
  'coupling',
  'active_ejector',
  'emergent_attractor',
] as const

export type AmvReportRegime = (typeof AMV_REPORT_REGIMES)[number]

export type AmvReportRegimeDefinition = {
  id: AmvReportRegime
  label: string
  reading: string
  boundary: string
  evidenceByItself: false
}

export const AMV_REPORT_REGIME_DEFINITIONS: Record<AmvReportRegime, AmvReportRegimeDefinition> = {
  contemplative: {
    id: 'contemplative',
    label: 'Contemplative',
    reading: 'El campo esta en observacion sin demanda inmediata de accion.',
    boundary: 'Etiqueta interpretativa; no evidencia por si misma.',
    evidenceByItself: false,
  },
  performative: {
    id: 'performative',
    label: 'Performative',
    reading: 'La salida parece sostener apariencia mas que conversion real.',
    boundary: 'Requiere evidencia de comportamiento, no solo tono.',
    evidenceByItself: false,
  },
  saturated: {
    id: 'saturated',
    label: 'Saturated',
    reading: 'El campo tiene demasiadas senales para decidir sin reduccion.',
    boundary: 'No autoriza descartar evidencia sin criterio.',
    evidenceByItself: false,
  },
  proto_critical: {
    id: 'proto_critical',
    label: 'Proto-critical',
    reading: 'Hay senales tempranas de riesgo critico o cambio de regimen.',
    boundary: 'No equivale a crisis confirmada.',
    evidenceByItself: false,
  },
  dissonant: {
    id: 'dissonant',
    label: 'Dissonant',
    reading: 'Capas o senales entran en contradiccion operativa.',
    boundary: 'La contradiccion debe apuntar a evidencia concreta.',
    evidenceByItself: false,
  },
  extractive: {
    id: 'extractive',
    label: 'Extractive',
    reading: 'La dinamica extrae energia, datos o legitimidad sin retorno visible.',
    boundary: 'No acusa intencion sin soporte.',
    evidenceByItself: false,
  },
  ghost: {
    id: 'ghost',
    label: 'Ghost',
    reading: 'Hay ausencia, sombra o legado que condiciona lectura actual.',
    boundary: 'Ausencia no prueba causalidad.',
    evidenceByItself: false,
  },
  coupling: {
    id: 'coupling',
    label: 'Coupling',
    reading: 'Elementos del campo muestran dependencia fuerte.',
    boundary: 'Acoplamiento no implica causalidad automatica.',
    evidenceByItself: false,
  },
  active_ejector: {
    id: 'active_ejector',
    label: 'Active ejector',
    reading: 'Un eyector activo puede degradar o bloquear cierre.',
    boundary: 'Debe estar sostenido por senal o evidencia verificable.',
    evidenceByItself: false,
  },
  emergent_attractor: {
    id: 'emergent_attractor',
    label: 'Emergent attractor',
    reading: 'Aparece una direccion con peso suficiente para orientar ruta.',
    boundary: 'No ejecuta ni cierra ruta por si mismo.',
    evidenceByItself: false,
  },
}

export function isAmvReportRegime(value: unknown): value is AmvReportRegime {
  return typeof value === 'string' && AMV_REPORT_REGIMES.includes(value as AmvReportRegime)
}
