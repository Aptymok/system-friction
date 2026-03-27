/**
 * sf-agents/debate.js
 * Motor de debate APTYMOK:
 * 1) Genera N escenarios variando parámetros del motor
 * 2) Deduplicación por similitud de estado final
 * 3) Votación/argumentos por rol
 * 4) Selección de top-3: consenso + eficiencia + wildcard
 */

import { seededRandom, hashInputsSync, makeScenario, makeAgentVote, makeTraceInfo } from '@sf/core'
import { simulate, snapshotToState } from '@sf/engine'
import { ROLES, ROLE_IDS } from './roles.js'

const ENGINE_VERSION = '2.0.0'

/**
 * Parámetros de generación de escenarios.
 * Cada "variación" altera los parámetros del simulador para obtener
 * escenarios diferentes (optimista, pesimista, acelerado, etc.)
 */
const SCENARIO_VARIATIONS = [
  { label: 'Baseline',     delta: {},                           description: 'Evolución natural sin intervención adicional.' },
  { label: 'Recuperación', delta: { alpha: 0.05, beta: 0.45 }, description: 'Mayor acoplamiento restaurador; recuperación rápida.' },
  { label: 'Estrés',       delta: { alpha: 0.25, kappa: 0.03 }, description: 'Incremento de carga acumulada; mayor fricción.' },
  { label: 'Foco',         delta: { gammaIAD: 0.25, gammaETE: 0.20 }, description: 'Mejora rápida de atención y eficiencia.' },
  { label: 'Resistencia',  delta: { eta: 0.01, theta: 0.35 }, description: 'Alta resiliencia; sistema muy estable.' },
  { label: 'Colapso',      delta: { alpha: 0.30, mu: 0.05, kappa: 0.02 }, description: 'Escenario de alta degradación si no hay intervención.' },
  { label: 'Equilibrio',   delta: { alpha: 0.10, delta: 0.05 }, description: 'Sistema converge lentamente hacia homeostasis.' },
  { label: 'Expansión',    delta: { beta: 0.50, theta: 0.30 }, description: 'Expansión cognitiva; alta variabilidad.' },
]

/**
 * Ejecuta el debate completo APTYMOK y devuelve un ScenarioSet con top-3.
 *
 * @param {import('@sf/core').CognitiveSnapshot} snapshot
 * @param {object} options
 * @param {string|number} options.seed
 * @param {number} options.T      — horizonte de simulación
 * @param {number} options.dt
 * @returns {{ scenarios: object[], top3: object, votes: object[] }}
 */
export function runDebate(snapshot, { seed = 42, T = 20, dt = 0.5 } = {}) {
  const rand = seededRandom(seed)
  const x0 = snapshotToState(snapshot)
  const inputsHash = hashInputsSync({ snapshot, seed, T, dt })

  // 1) Generar escenarios
  const rawScenarios = SCENARIO_VARIATIONS.map((variation, i) => {
    // Seed derivada determinista para cada escenario
    const scenarioSeed = `${seed}-${i}`
    const { trajectory, finalMetrics } = simulate(x0, variation.delta, scenarioSeed, T, dt)
    // ID determinista: hash de seed + variación
    const deterministicId = `scenario-${hashInputsSync({ seed, i, label: variation.label })}`

    return makeScenario({
      id: deterministicId,
      label: variation.label,
      description: variation.description,
      finalState: finalMetrics,
      trajectory,
      generatedBy: 'math',
      probability: estimateProbability(finalMetrics, rand),
      trace: makeTraceInfo({
        inputsHash,
        method: `simulate-${variation.label}`,
        seed: String(scenarioSeed),
        engineVersion: ENGINE_VERSION,
      }),
    })
  })

  // 2) Deduplicación: eliminar escenarios muy similares (distancia euclidiana en estado final)
  const deduplicated = deduplicate(rawScenarios, 0.05)

  // 3) Votación por agente
  const votes = []
  for (const roleId of ROLE_IDS) {
    const role = ROLES[roleId]
    for (const scenario of deduplicated) {
      const score = computeRoleScore(role, scenario.finalState)
      const argument = generateArgument(role, scenario)
      votes.push(makeAgentVote({
        agentId: roleId,
        scenarioId: scenario.id,
        score,
        argument,
      }))
    }
  }

  // 4) Selección top-3
  const top3 = selectTop3(deduplicated, votes, seed)

  return { scenarios: deduplicated, top3, votes }
}

// ---- Selección top-3 ----

function selectTop3(scenarios, votes, seed) {
  // Consenso: mayor suma de scores de SHINJI + REI
  const consensusScores = aggregateScores(scenarios, votes, ['SHINJI', 'REI'])
  const consensus = maxBy(scenarios, s => consensusScores[s.id] ?? 0)

  // Eficiencia: mayor score de SHADOW
  const efficiencyScores = aggregateScores(scenarios, votes, ['SHADOW'])
  const efficiency = maxBy(scenarios, s => efficiencyScores[s.id] ?? 0)

  // Wildcard: mayor score de KAWORU, pero diferente a los anteriores
  const wildcardScores = aggregateScores(scenarios, votes, ['KAWORU'])
  const wildcard = maxBy(
    scenarios.filter(s => s.id !== consensus.id && s.id !== efficiency.id),
    s => wildcardScores[s.id] ?? 0
  ) ?? scenarios.find(s => s.id !== consensus.id && s.id !== efficiency.id) ?? scenarios[0]

  return { consensus, efficiency, wildcard }
}

function aggregateScores(scenarios, votes, agentIds) {
  const result = {}
  for (const s of scenarios) {
    result[s.id] = votes
      .filter(v => v.scenarioId === s.id && agentIds.includes(v.agentId))
      .reduce((sum, v) => sum + v.score, 0)
  }
  return result
}

function maxBy(arr, fn) {
  if (!arr.length) return null
  return arr.reduce((best, item) => fn(item) > fn(best) ? item : best, arr[0])
}

// ---- Scoring por rol ----

function computeRoleScore(role, finalState) {
  let score = 0
  let totalWeight = 0
  for (const [metric, weight] of Object.entries(role.scoreWeights)) {
    const value = finalState[metric] ?? 0
    // Normalizar IHG de [-1,1] a [0,1]
    const norm = metric === 'IHG' ? (value + 1) / 2 : value
    score += weight * norm
    totalWeight += Math.abs(weight)
  }
  // Normalizar a [0, 1]
  if (totalWeight === 0) return 0.5
  return clamp(score / totalWeight + 0.5, 0, 1)
}

function generateArgument(role, scenario) {
  const { IHG, NTI, R, frictionScore, status } = scenario.finalState
  const lines = []

  lines.push(`[${role.id}] "${scenario.label}" → ${status}`)
  lines.push(`IHG=${fmt(IHG)}, NTI=${fmt(NTI)}, R=${fmt(R)}, F=${fmt(frictionScore)}`)

  if (role.id === 'SHINJI') {
    lines.push(IHG > 0 ? 'Homeostasis recuperable.' : 'Riesgo de desequilibrio persistente.')
  } else if (role.id === 'REI') {
    lines.push(NTI < 0.4 ? 'Tensión manejable, integración posible.' : 'Alta tensión; requiere cuidado.')
  } else if (role.id === 'SHADOW') {
    lines.push(frictionScore < 0.3 ? 'Eficiencia aceptable.' : 'Fricción alta; considerar disrupción.')
  } else if (role.id === 'KAWORU') {
    lines.push(`Potencial divergente: IAD=${fmt(scenario.finalState.IAD)}, ETE=${fmt(scenario.finalState.ETE)}`)
  }

  return lines.join(' | ')
}

// ---- Utilidades ----

function estimateProbability(finalMetrics, rand) {
  // Probabilidad base inversamente proporcional a la fricción
  const base = 1 - finalMetrics.frictionScore * 0.7
  // Añadir algo de ruido seeded para diversidad
  const jitter = (rand() - 0.5) * 0.1
  return clamp(base + jitter, 0.05, 0.95)
}

/**
 * Deduplicación por distancia euclidiana entre estados finales.
 * Si dos escenarios son muy similares (dist < threshold), se conserva solo uno.
 */
function deduplicate(scenarios, threshold = 0.05) {
  const kept = []
  for (const s of scenarios) {
    const tooClose = kept.some(k => stateDistance(k.finalState, s.finalState) < threshold)
    if (!tooClose) kept.push(s)
  }
  return kept
}

function stateDistance(a, b) {
  const keys = ['IHG', 'NTI', 'R', 'IAD', 'ETE']
  return Math.sqrt(keys.reduce((sum, k) => sum + ((a[k] ?? 0) - (b[k] ?? 0)) ** 2, 0))
}

function clamp(v, min, max) {
  if (!isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function fmt(v) {
  return typeof v === 'number' ? v.toFixed(3) : String(v)
}
