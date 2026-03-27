/**
 * SocSim Engine Ψ — SystemFriction v2
 * Variables: A (activación), P (polarización), C (coherencia), T (tensión),
 *            N (novedad), S (sincronía), R (resiliencia), X (fricción sistémica)
 * Determinista por seed. Step forward + retro-step.
 */

export const PSI_KEYS = ['A', 'P', 'C', 'T', 'N', 'S', 'R', 'X']
export const PSI_LABELS = {
  A: 'Activación',
  P: 'Polarización',
  C: 'Coherencia',
  T: 'Tensión',
  N: 'Novedad',
  S: 'Sincronía',
  R: 'Resiliencia',
  X: 'Fricción',
}

export const DEFAULT_PSI = { A: 0.5, P: 0.3, C: 0.6, T: 0.3, N: 0.5, S: 0.55, R: 0.65, X: 0.25 }

/**
 * Extract heuristic features from text input.
 */
export function textToFeatures(text) {
  const lower = text.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  const n = words.length || 1

  const negWords = ['mal', 'estrés', 'stress', 'difícil', 'tenso', 'confuso', 'perdido', 'cansado', 'agotado', 'miedo', 'ansiedad', 'frustrado', 'bloqueado', 'caótico', 'crisis']
  const posWords = ['bien', 'claro', 'energía', 'foco', 'logro', 'avance', 'calma', 'tranquilo', 'satisfecho', 'logrado', 'flujo', 'óptimo', 'equilibrio', 'conectado']
  const urgWords = ['urgente', 'ahora', 'inmediato', 'rápido', 'ya', 'pronto', 'crítico', 'emergencia']

  let neg = 0, pos = 0, urg = 0
  for (const w of words) {
    if (negWords.some(nw => w.includes(nw))) neg++
    if (posWords.some(pw => w.includes(pw))) pos++
    if (urgWords.some(uw => w.includes(uw))) urg++
  }

  const unique = new Set(words).size
  const polarity = (pos - neg) / n
  const intensity = Math.min(1, n / 40 + urg * 0.2)
  const coherence = Math.min(1, unique / n + 0.2)
  const novelty = Math.min(1, unique / n * 1.2)
  const tension = Math.min(1, neg / n * 6 + urg * 0.15)
  const polarization = Math.min(1, 0.5 - polarity * 3)

  return {
    intensity: clamp(intensity, 0, 1),
    polarization: clamp(polarization, 0, 1),
    novelty: clamp(novelty, 0, 1),
    coherence: clamp(coherence, 0, 1),
    tension: clamp(tension, 0, 1),
  }
}

/**
 * Step the Ψ engine forward by one tick.
 * @param {Object} state - current Ψ state
 * @param {Object} features - text features (optional)
 * @param {Object} params - friction, shock, noise, seed
 * @returns {Object} new Ψ state
 */
export function step(state, features = {}, params = {}) {
  const {
    frictionCoef = 0.1,
    shockAmplitude = 0,
    noiseLevel = 0.025,
    seed = Date.now(),
  } = params

  const rng = lcg((seed * 1664525 + 1013904223) >>> 0)
  const noise = () => (rng() - 0.5) * noiseLevel * 2

  const { intensity = 0.5, polarization = 0.3, novelty = 0.5, coherence = 0.6, tension = 0.3 } = features

  const dt = 0.12

  // Coupled ODE system for Ψ variables
  const dA = (intensity * 0.8 - state.A) * 0.3 + noise()
  const dP = (polarization - state.P) * 0.2 + state.T * 0.08 - state.C * 0.05 + noise()
  const dC = (coherence - state.C) * 0.2 - state.P * 0.06 + state.S * 0.04 + noise()
  const dT = (tension - state.T) * 0.25 + state.X * 0.06 + shockAmplitude * 0.1 + noise()
  const dN = (novelty - state.N) * 0.15 + noise()
  const dS = (state.C * 0.6 - state.P * 0.4) * 0.1 + noise()
  const dR = ((1 - state.T) * 0.5 + state.C * 0.3 - state.P * 0.2 - state.R) * 0.08 + noise()
  const dX = frictionCoef * (state.T * 0.5 + state.P * 0.3 - state.R * 0.4) + shockAmplitude * 0.08 + noise()

  return {
    A: clamp(state.A + dA * dt, 0, 1),
    P: clamp(state.P + dP * dt, 0, 1),
    C: clamp(state.C + dC * dt, 0, 1),
    T: clamp(state.T + dT * dt, 0, 1),
    N: clamp(state.N + dN * dt, 0, 1),
    S: clamp(state.S + dS * dt, 0, 1),
    R: clamp(state.R + dR * dt, 0, 1),
    X: clamp(state.X + dX * dt, 0, 1),
  }
}

/**
 * Retro-step: move backward in time toward a previous state.
 */
export function retroStep(state, history) {
  if (history.length < 2) return state
  const prev = history[history.length - 2]
  return {
    A: clamp(prev.A * 0.7 + state.A * 0.3, 0, 1),
    P: clamp(prev.P * 0.8 + state.P * 0.2, 0, 1),
    C: clamp(Math.min(1, state.C + 0.04), 0, 1),
    T: clamp(state.T * 0.75, 0, 1),
    N: clamp(prev.N * 0.9 + state.N * 0.1, 0, 1),
    S: clamp(prev.S * 0.8 + state.S * 0.2, 0, 1),
    R: clamp(Math.min(1, state.R + 0.03), 0, 1),
    X: clamp(state.X * 0.8, 0, 1),
  }
}

/** Compute FSoc (Social Friction) from Ψ state */
export function computeFSoc(state) {
  return clamp(state.T * 0.4 + state.P * 0.3 + state.X * 0.3, 0, 1)
}

/** Compute RSoc (Social Resilience) from Ψ state */
export function computeRSoc(state) {
  return clamp(state.R * 0.5 + state.C * 0.3 + state.S * 0.2, 0, 1)
}

/** Compute FractureRisk from Ψ state */
export function computeFractureRisk(state) {
  return clamp(state.T * 0.5 + state.P * 0.3 + (1 - state.R) * 0.2, 0, 1)
}

/** Generate future scenarios based on current Ψ state */
export function generateFutureScenarios(state, features = {}) {
  const fsoc = computeFSoc(state)
  const rsoc = computeRSoc(state)
  const fr = computeFractureRisk(state)

  return [
    {
      type: 'consensus',
      label: 'Equilibrio Gradual',
      desc: `Tensión T=${fmt(state.T)} se disuelve lentamente. Coherencia estabiliza en C≈${fmt(Math.min(1, state.C + 0.12))}. Sistema converge hacia homeostasis en 4-6 ciclos.`,
      probability: clamp(1 - fsoc * 0.6, 0.3, 0.85),
      finalIHG: clamp(state.C - state.P * 0.3, -0.5, 0.8),
      attractor: 'Reducir T mediante estructura. Incrementar S con checkpoints regulares.',
    },
    {
      type: 'efficiency',
      label: 'Activación Dirigida',
      desc: `Aprovechar A=${fmt(state.A)} alto. Canalizar N=${fmt(state.N)} hacia tareas nuevas. R=${fmt(state.R)} sostiene el ritmo acelerado.`,
      probability: clamp(rsoc * 0.7, 0.2, 0.75),
      finalIHG: clamp(state.A * 0.6 + state.R * 0.3 - state.T * 0.2, -0.3, 0.9),
      attractor: 'Sprint de alta activación con sincronización S cada 2 ciclos.',
    },
    {
      type: 'wildcard',
      label: fr > 0.6 ? 'Ruptura y Reconfiguración' : 'Salto de Estado',
      desc: fr > 0.6
        ? `FractureRisk=${fmt(fr)} elevado. Posible discontinuidad sistémica. P=${fmt(state.P)} genera bifurcación.`
        : `N=${fmt(state.N)} alto habilita transición de estado no lineal. Nueva configuración C-S.`,
      probability: clamp(fr * 0.5 + (1 - rsoc) * 0.3, 0.1, 0.6),
      finalIHG: clamp((Math.random() - 0.5) * 0.8, -0.8, 0.7),
      attractor: fr > 0.6 ? 'Intervención de choque: reducir P urgente, inyectar R externo.' : 'Explorar configuración novel. Permitir N alta por 1 ciclo.',
    },
  ]
}

/** Infer retroactive context from chat + Ψ history */
export function inferRetroactivity(text, psiState, features = {}) {
  const items = []

  if (features.tension > 0.5) {
    items.push(`T=${fmt(psiState.T)} sugiere tensión acumulada antes de esta sesión. El patrón comenzó antes del momento de captura.`)
  }
  if (features.polarization > 0.5) {
    items.push(`P=${fmt(psiState.P)} indica conflicto no resuelto. Origen probable: evaluación dicotómica de alternativas previas.`)
  }
  if (psiState.R < 0.4) {
    items.push(`R=${fmt(psiState.R)} bajo: la resiliencia se agotó antes de este punto. El sistema lleva ciclos operando con buffer reducido.`)
  }
  if (features.coherence < 0.4) {
    items.push(`C=${fmt(psiState.C)} sugiere fragmentación previa. El contexto cognitivo estaba disperso al momento de la captura.`)
  }
  if (items.length === 0) {
    items.push(`Estado previo estable. Φ=${fmt((psiState.C + psiState.S) / 2)} sugiere integración saludable en ciclos anteriores.`)
    items.push(`La activación A=${fmt(psiState.A)} es coherente con el historial reciente del sistema.`)
  }

  return items
}

// ── Internals ──

function fmt(v) { return typeof v === 'number' ? v.toFixed(2) : '?' }
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, isNaN(v) ? mn : v)) }

function lcg(seed) {
  let s = (seed | 0) >>> 0
  return () => {
    s = ((1664525 * s + 1013904223) >>> 0)
    return s / 2 ** 32
  }
}
