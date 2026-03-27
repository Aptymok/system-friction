/**
 * MIHM Engine — browser-side port of sf-engine for SystemFriction v2
 * IHG, NTI, R, IAD, ETE with RK4 integration + Pontryagin control + seeded noise.
 */

export const METRICS_LABELS = {
  IHG: 'Índice de Homeostasis Global',
  NTI: 'Nivel de Tensión Interna',
  R: 'Resiliencia',
  IAD: 'Índice de Atención Distribuida',
  ETE: 'Eficiencia de Transición de Estado',
}

// Default simulation parameters
export const DEFAULT_PARAMS = {
  alpha: 0.3,   // IHG recovery rate
  beta: 0.25,   // NTI decay
  gamma: 0.2,   // R growth
  delta: 0.15,  // IAD coupling
  eta: 0.18,    // ETE coupling
  noiseAmp: 0.04,
}

/**
 * Convert a CognitiveSnapshot-like object to initial MIHM state.
 */
export function snapshotToState(snapshot) {
  const { valence = 0, arousal = 0.5, tension = 0.5, focus = 0.5 } = snapshot
  return {
    IHG: clamp(valence * 0.8 + (1 - tension) * 0.2, -1, 1),
    NTI: clamp(tension * 0.7 + (1 - focus) * 0.3, 0, 1),
    R: clamp(focus * 0.5 + (1 - tension) * 0.5, 0, 1),
    IAD: clamp(focus * 0.7 + arousal * 0.3, 0, 1),
    ETE: clamp(arousal * 0.4 + (1 - tension) * 0.6, 0, 1),
  }
}

/**
 * Compute derived metrics from MIHM state.
 */
export function computeMetrics(state) {
  const frictionScore = clamp(
    state.NTI * 0.4 + (1 - state.R) * 0.3 + (1 - state.ETE) * 0.3,
    0, 1
  )
  const status = classifyStatus(state.IHG, frictionScore)
  return { ...state, frictionScore, status }
}

export function classifyStatus(IHG, frictionScore) {
  if (IHG < -0.5 || frictionScore > 0.75) return 'COLLAPSE'
  if (IHG < -0.2 || frictionScore > 0.6) return 'CRITICAL'
  if (IHG < 0.1 || frictionScore > 0.4) return 'DEGRADED'
  return 'OK'
}

/**
 * Run MIHM simulation using RK4 integrator.
 * @param {Object} x0 - initial state {IHG, NTI, R, IAD, ETE}
 * @param {Object} params - simulation parameters
 * @param {number|string} seed - deterministic seed
 * @param {number} T - time horizon (steps)
 * @param {number} dt - time step
 * @returns {{trajectory: Array, finalMetrics: Object}}
 */
export function simulate(x0, params = DEFAULT_PARAMS, seed = 42, T = 20, dt = 0.5) {
  const rng = seededRandom(seed)
  const { alpha, beta, gamma, delta, eta, noiseAmp } = { ...DEFAULT_PARAMS, ...params }

  // Pontryagin optimal control gain
  const K = Math.sqrt(1.2 / 0.75)

  const trajectory = []
  let state = { ...x0 }

  for (let t = 0; t < T; t++) {
    const noise = (rng() - 0.5) * noiseAmp * 2

    // RK4 integration
    const k1 = ode(state, alpha, beta, gamma, delta, eta, K, noise)
    const s2 = addScaled(state, k1, dt / 2)
    const k2 = ode(s2, alpha, beta, gamma, delta, eta, K, 0)
    const s3 = addScaled(state, k2, dt / 2)
    const k3 = ode(s3, alpha, beta, gamma, delta, eta, K, 0)
    const s4 = addScaled(state, k3, dt)
    const k4 = ode(s4, alpha, beta, gamma, delta, eta, K, 0)

    state = {
      IHG: clamp(state.IHG + (dt / 6) * (k1.IHG + 2 * k2.IHG + 2 * k3.IHG + k4.IHG), -1, 1),
      NTI: clamp(state.NTI + (dt / 6) * (k1.NTI + 2 * k2.NTI + 2 * k3.NTI + k4.NTI), 0, 1),
      R: clamp(state.R + (dt / 6) * (k1.R + 2 * k2.R + 2 * k3.R + k4.R), 0, 1),
      IAD: clamp(state.IAD + (dt / 6) * (k1.IAD + 2 * k2.IAD + 2 * k3.IAD + k4.IAD), 0, 1),
      ETE: clamp(state.ETE + (dt / 6) * (k1.ETE + 2 * k2.ETE + 2 * k3.ETE + k4.ETE), 0, 1),
    }

    trajectory.push({ t: t * dt, ...state })
  }

  return { trajectory, finalMetrics: computeMetrics(state) }
}

// ── MIHM ODE system ───────────────────────────────────────────────────────────

function ode(x, alpha, beta, gamma, delta, eta, K, noise) {
  const u = -K * x.NTI  // Pontryagin control input
  return {
    IHG: alpha * (1 - x.NTI) - (1 - x.R) * 0.15 + noise,
    NTI: -beta * x.NTI + (1 - x.IHG) * 0.1 + u * 0.05,
    R: gamma * (1 - x.R) * x.ETE - x.NTI * 0.08,
    IAD: delta * (x.R - x.IAD) - x.NTI * 0.05,
    ETE: eta * (x.R * 0.5 + x.IAD * 0.5 - x.ETE),
  }
}

function addScaled(state, deriv, h) {
  return {
    IHG: state.IHG + deriv.IHG * h,
    NTI: state.NTI + deriv.NTI * h,
    R: state.R + deriv.R * h,
    IAD: state.IAD + deriv.IAD * h,
    ETE: state.ETE + deriv.ETE * h,
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function clamp(v, mn, mx) {
  return Math.min(mx, Math.max(mn, isNaN(v) ? mn : v))
}

function seededRandom(seed) {
  let s = typeof seed === 'string' ? stringToInt(seed) : (seed | 0)
  const a = 1664525, c = 1013904223, m = 2 ** 32
  return () => { s = ((a * s + c) >>> 0); return s / m }
}

function stringToInt(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h = h | 0
  }
  return h >>> 0
}
