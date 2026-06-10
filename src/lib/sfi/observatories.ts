export const SFI_OBSERVATORIES = {
  SFI_OBS_N0: {
    internalKey: 'root',
    publicLabel: 'SFI-OBS-N0',
    description: 'Observatorio del nodo raiz. El observador como objeto medible.',
    route: '/root',
    weight: 0.90,
  },
  SCOREFRICTION: {
    internalKey: 'scorefriction',
    publicLabel: 'ScoreFriction',
    description: 'Observatorio longitudinal de campo cultural y atractores.',
    route: '/scorefriction',
    weight: 0.86,
  },
  MOPH: {
    internalKey: 'moph',
    publicLabel: 'MOP-H',
    description: 'Instrumento fenomenologico humano.',
    route: '/moph',
    weight: 0.58,
  },
  REPOSITORY: {
    internalKey: 'repository',
    publicLabel: 'Repositorio Fundacional',
    description: 'Grafo vivo de metodologia, evidencia, modelos y fenomenos.',
    route: '/repository',
    weight: 0.95,
  },
} as const

export type SfiObservatoryKey = keyof typeof SFI_OBSERVATORIES

export function getSfiObservatory(key: SfiObservatoryKey) {
  return SFI_OBSERVATORIES[key]
}
