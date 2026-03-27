/**
 * sf-agents/roles.js
 * Definición de los 4 roles APTYMOK del sistema de debate.
 *
 * Referencia: legacy/repo_snapshot/eidolon_engine/eidolon_persona.js
 */

export const ROLES = {
  SHINJI: {
    id: 'SHINJI',
    name: 'SHINJI',
    archetype: 'Analítico/Metódico',
    priority: 'precisión y estabilidad',
    scoreWeights: {
      IHG: 0.40,   // prioriza homeostasis
      NTI: -0.20,  // penaliza alta tensión
      R:   0.25,   // valora resiliencia
      ETE: 0.15,   // valora eficiencia
    },
    bias: 'consensus',
  },
  REI: {
    id: 'REI',
    name: 'REI',
    archetype: 'Empático/Integrador',
    priority: 'bienestar y conexión',
    scoreWeights: {
      IHG: 0.30,
      NTI: -0.30,  // muy sensible a tensión
      R:   0.30,
      IAD: 0.10,
    },
    bias: 'consensus',
  },
  SHADOW: {
    id: 'SHADOW',
    name: 'SHADOW',
    archetype: 'Crítico/Disruptivo',
    priority: 'desafiar supuestos y eficiencia extrema',
    scoreWeights: {
      IHG: 0.15,
      NTI:  0.10,  // puede tolerar tensión si hay ganancia
      R:   -0.10,  // desconfía de comodidad
      ETE:  0.50,  // prioriza eficiencia de transición
      frictionScore: -0.25,
    },
    bias: 'efficiency',
  },
  KAWORU: {
    id: 'KAWORU',
    name: 'KAWORU',
    archetype: 'Visionario/Divergente',
    priority: 'explorar posibilidades inesperadas',
    scoreWeights: {
      IHG:  0.10,
      NTI:  0.05,
      R:    0.15,
      IAD:  0.40,  // prioriza atención distribuida (creatividad)
      ETE:  0.30,
    },
    bias: 'wildcard',
  },
}

export const ROLE_IDS = Object.keys(ROLES)
