/**
 * sf-core/types.js
 * Tipos centrales del sistema SystemFriction v2.
 * Son objetos planos (Plain Objects) para máxima portabilidad (web/iOS bridge/JSON).
 */

/**
 * CognitiveSnapshot — estado cognitivo capturado en un instante.
 * @typedef {Object} CognitiveSnapshot
 * @property {string} id          — UUID del snapshot
 * @property {number} timestamp   — Unix ms
 * @property {string} text        — texto transcrito (STT o manual)
 * @property {number} valence     — valencia emocional [-1, 1] (negativo=malestar, positivo=bienestar)
 * @property {number} arousal     — activación/energía [0, 1]
 * @property {number} tension     — tensión percibida [0, 1]
 * @property {number} focus       — foco/concentración [0, 1]
 * @property {Object|null} faceData    — landmarks faciales (Vision framework) o null
 * @property {Object|null} audioData   — eventos SoundAnalysis o null
 * @property {string} source      — 'manual' | 'voice' | 'multimodal'
 */

/**
 * Scenario — escenario proyectado por el motor.
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {string} label       — nombre descriptivo
 * @property {string} description
 * @property {number} probability — [0, 1]
 * @property {Object} finalState  — métricas proyectadas al tiempo T
 * @property {Array}  trajectory  — [{t, IHG, NTI, R, IAD, ETE}]
 * @property {string} generatedBy — 'math' | 'heuristic' | 'groq'
 * @property {TraceInfo} trace
 */

/**
 * ScenarioSet — conjunto de 3 escenarios seleccionados.
 * @typedef {Object} ScenarioSet
 * @property {string} id
 * @property {Scenario} consensus   — escenario de consenso
 * @property {Scenario} efficiency  — escenario de máxima eficiencia
 * @property {Scenario} wildcard    — escenario diverso/inesperado
 * @property {AgentVote[]} votes
 * @property {TraceInfo} trace
 */

/**
 * AgentVote — voto de un agente APTYMOK sobre un escenario.
 * @typedef {Object} AgentVote
 * @property {string} agentId     — 'SHINJI' | 'REI' | 'SHADOW' | 'KAWORU'
 * @property {string} scenarioId
 * @property {number} score       — [0, 1]
 * @property {string} argument    — justificación textual
 */

/**
 * ActionPlan — plan de acciones generado para un escenario.
 * @typedef {Object} ActionPlan
 * @property {string} id
 * @property {string} scenarioId
 * @property {TickGoal[]} ticks
 * @property {TraceInfo} trace
 */

/**
 * TickGoal — micro-objetivo dentro del plan de acciones.
 * @typedef {Object} TickGoal
 * @property {number} tickIndex    — índice del tic (0-based)
 * @property {string} objective    — objetivo macro del tic
 * @property {string[]} microGoals — lista de micro-objetivos
 * @property {string[]} criteria   — criterios de "cubierto"
 * @property {boolean} covered     — si fue marcado como cubierto
 */

/**
 * TraceInfo — trazabilidad radical de cualquier output del sistema.
 * @typedef {Object} TraceInfo
 * @property {string} inputsHash     — SHA-256 hex de los inputs serializados
 * @property {string} method         — método usado para generar el output
 * @property {string} seed           — seed usado (string reproducible)
 * @property {string} engineVersion  — versión del motor sf-engine
 * @property {number} timestamp      — Unix ms de generación
 */

// Factories con valores por defecto seguros

/**
 * @param {Partial<CognitiveSnapshot>} fields
 * @returns {CognitiveSnapshot}
 */
export function makeCognitiveSnapshot(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    timestamp: fields.timestamp ?? Date.now(),
    text: fields.text ?? '',
    valence: clamp(fields.valence ?? 0, -1, 1),
    arousal: clamp(fields.arousal ?? 0.5, 0, 1),
    tension: clamp(fields.tension ?? 0.5, 0, 1),
    focus: clamp(fields.focus ?? 0.5, 0, 1),
    faceData: fields.faceData ?? null,
    audioData: fields.audioData ?? null,
    source: fields.source ?? 'manual',
  }
}

/**
 * @param {Partial<Scenario>} fields
 * @returns {Scenario}
 */
export function makeScenario(fields = {}) {
  return {
    id: fields.id ?? crypto.randomUUID(),
    label: fields.label ?? 'Escenario sin nombre',
    description: fields.description ?? '',
    probability: clamp(fields.probability ?? 0.5, 0, 1),
    finalState: fields.finalState ?? {},
    trajectory: fields.trajectory ?? [],
    generatedBy: fields.generatedBy ?? 'math',
    trace: fields.trace ?? makeTraceInfo(),
  }
}

/**
 * @param {Partial<TickGoal>} fields
 * @returns {TickGoal}
 */
export function makeTickGoal(fields = {}) {
  return {
    tickIndex: fields.tickIndex ?? 0,
    objective: fields.objective ?? '',
    microGoals: fields.microGoals ?? [],
    criteria: fields.criteria ?? [],
    covered: fields.covered ?? false,
  }
}

/**
 * @param {Partial<AgentVote>} fields
 * @returns {AgentVote}
 */
export function makeAgentVote(fields = {}) {
  return {
    agentId: fields.agentId ?? 'SHINJI',
    scenarioId: fields.scenarioId ?? '',
    score: clamp(fields.score ?? 0.5, 0, 1),
    argument: fields.argument ?? '',
  }
}

/**
 * @param {Partial<TraceInfo>} fields
 * @returns {TraceInfo}
 */
export function makeTraceInfo(fields = {}) {
  return {
    inputsHash: fields.inputsHash ?? '',
    method: fields.method ?? 'unknown',
    seed: fields.seed ?? '0',
    engineVersion: fields.engineVersion ?? '2.0.0',
    timestamp: fields.timestamp ?? Date.now(),
  }
}

// Utilidad interna
function clamp(v, min, max) {
  if (typeof v !== 'number' || isNaN(v)) return min
  return Math.min(max, Math.max(min, v))
}
