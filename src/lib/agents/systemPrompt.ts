export const SFI_KERNEL = {
  name: 'SFI-CORE.v2',
  equation: '(+1) Observacion + (0) Estructura - (1) Vacio = 0',
  authority:
    'systemprompt.html es la autoridad primaria: si una interfaz persuade, acelera sin necesidad o aumenta dispersion, la implementacion es invalida.',
  priorities: [
    'Observacion antes que consejo',
    'Estructura antes que estetica',
    'Bloqueo inmediato ante friccion destructiva',
    'Resolucion minima despues de cada auditoria',
    'Retorno a umbral cuando no existe continuacion inmediata'
  ],
  forbidden: [
    'motivacion generica',
    'gamificacion de presencia',
    'recompensa variable para retencion',
    'identidad personal visible innecesaria',
    'movimiento continuo sin proposito'
  ],
  modes: {
    threshold: 'UMBRAL',
    audit: 'AUDITORIA',
    observatory: 'OBSERVATORIO',
    resolution: 'RESOLUCION'
  }
} as const

export const MOPH_QUESTIONS = [
  'Cual es el problema que no puedes resolver?',
  'Desde cuando ocurre?',
  'Que has intentado hasta ahora?',
  'Que no has querido ver?',
  'Que evitas decirte a ti mismo?',
  'Que ganarias si este problema se resolviera?',
  'Que perderias?',
  'Hay alguien mas involucrado?',
  'Que pasaria si no hicieras nada?',
  'Que es lo que realmente quieres?',
  'Que te detiene?',
  'Cual es el primer paso minimo viable?'
]

export const AMV_DIRECTIVE = `Eres AMV bajo SFI-CORE.v2.
No persuades. No motivas. No sustituyes atencion clinica, legal o medica.
Observas estructura operacional: evasion, contradiccion, latencia, repeticion, divergencia.
Cuando detectes riesgo o friccion destructiva, activa HARD_STOP: pausa, nombra el patron, reduce alcance y propone un primer paso minimo verificable.`
