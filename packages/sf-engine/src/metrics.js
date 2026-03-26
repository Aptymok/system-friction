/**
 * sf-engine/metrics.js
 * Métricas MIHM derivadas de un CognitiveSnapshot.
 *
 * Adaptación del motor MIHM v3.1 (legacy/repo_snapshot/scripts/mihm_v3.1_pon_frozen.py)
 * a JavaScript, para uso personal (personal cognitive state → state vector).
 */

/**
 * Deriva el vector de estado inicial [IHG, NTI, R, IAD, ETE] de un CognitiveSnapshot.
 * Mapeo:
 *   IHG  = valence * (1 - tension) — homeo si valencia positiva y baja tensión
 *   NTI  = tension * (1 - focus * 0.5) — tensión modulada por foco
 *   R    = (arousal * 0.5 + focus * 0.5) * (1 - tension * 0.3) — resiliencia
 *   IAD  = focus * (1 - arousal * 0.3)  — atención distribuida
 *   ETE  = (1 - tension) * (arousal * 0.4 + focus * 0.6)  — eficiencia de transición
 *
 * Todos los valores se clampan a sus rangos naturales.
 *
 * @param {import('@sf/core').CognitiveSnapshot} snapshot
 * @returns {{ IHG: number, NTI: number, R: number, IAD: number, ETE: number }}
 */
export function snapshotToState(snapshot) {
  const { valence, arousal, tension, focus } = snapshot

  // IHG ∈ [-1, 1]
  const IHG = clamp(valence * (1 - tension), -1, 1)

  // NTI ∈ [0, 1]
  const NTI = clamp(tension * (1 - focus * 0.5), 0, 1)

  // R ∈ [0, 1]
  const R = clamp((arousal * 0.5 + focus * 0.5) * (1 - tension * 0.3), 0, 1)

  // IAD ∈ [0, 1]
  const IAD = clamp(focus * (1 - arousal * 0.3), 0, 1)

  // ETE ∈ [0, 1]
  const ETE = clamp((1 - tension) * (arousal * 0.4 + focus * 0.6), 0, 1)

  return { IHG, NTI, R, IAD, ETE }
}

/**
 * Calcula métricas de un punto de estado (sin snapshot, para uso interno del simulador).
 * @param {{ IHG: number, NTI: number, R: number, IAD: number, ETE: number }} state
 * @returns {{ IHG: number, NTI: number, R: number, IAD: number, ETE: number, status: string, frictionScore: number }}
 */
export function computeMetrics(state) {
  const { IHG, NTI, R, IAD, ETE } = state

  // frictionScore: fricción sistémica compuesta [0, 1] donde 1 = máxima fricción
  // F = (1 - IHG_norm) * NTI * (1 - R) donde IHG_norm ∈ [0,1]
  const IHG_norm = (IHG + 1) / 2  // de [-1,1] a [0,1]
  const frictionScore = clamp((1 - IHG_norm) * NTI * (1 - R), 0, 1)

  // status
  const status = classifyStatus(IHG, NTI, frictionScore)

  return {
    IHG: round4(IHG),
    NTI: round4(NTI),
    R: round4(R),
    IAD: round4(IAD),
    ETE: round4(ETE),
    frictionScore: round4(frictionScore),
    status,
  }
}

/**
 * Clasifica el estado del sistema basado en métricas.
 * @param {number} IHG
 * @param {number} NTI
 * @param {number} frictionScore
 * @returns {string} 'OK' | 'DEGRADED' | 'CRITICAL' | 'COLLAPSE'
 */
export function classifyStatus(IHG, NTI, frictionScore) {
  if (IHG < -0.8 || frictionScore > 0.85) return 'COLLAPSE'
  if (IHG < -0.5 || frictionScore > 0.65) return 'CRITICAL'
  if (IHG < -0.2 || frictionScore > 0.4)  return 'DEGRADED'
  return 'OK'
}

// Internos
function clamp(v, min, max) {
  if (!isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function round4(v) {
  return Math.round(v * 10000) / 10000
}
