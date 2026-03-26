/**
 * sf-engine/simulate.js
 * Simulador determinista por seed del motor MIHM/SystemFriction.
 *
 * ODE system (adaptado del modelo dinámico MIHM v3.1):
 *   dIHG = -alpha*IHG + beta*NTI*R*(1-|IHG|) - kappa*LDI + u_control
 *   dNTI = -delta*NTI + 0.25*IHG*(1-NTI²) - mu*max(0, LDI-0.5)
 *   dR   = -eta*R + theta*IHG*NTI
 *   dIAD = (IAD_target - IAD) * gamma_iad
 *   dETE = (ETE_target - ETE) * gamma_ete
 *
 * Integración: RK4 (Runge-Kutta 4to orden).
 * Ruido: LCG seeded para reproducibilidad.
 */

import { seededRandom } from '@sf/core'
import { computeMetrics } from './metrics.js'

// Parámetros del modelo (calibrados desde MIHM v3.1)
const PARAMS_DEFAULT = {
  alpha:  0.15,   // tasa de decaimiento IHG
  beta:   0.35,   // acoplamiento NTI-R→IHG
  delta:  0.08,   // tasa de decaimiento NTI
  eta:    0.05,   // tasa de decaimiento R
  theta:  0.20,   // acoplamiento IHG-NTI→R
  kappa:  0.012,  // influencia de carga acumulada (LDI)
  mu:     0.018,  // penalización de sobrecarga
  sigma:  0.08,   // amplitud de ruido estocástico
  gammaIAD: 0.10, // velocidad de ajuste IAD
  gammaETE: 0.12, // velocidad de ajuste ETE
}

// Control Pontryagin simplificado
const CONTROL_ALPHA1 = 1.2
const CONTROL_ALPHA2 = 0.75
const IHG_TARGET = 0.0  // homeostasis en 0

/**
 * Simula la trayectoria del sistema a partir de un estado inicial.
 *
 * @param {import('./metrics.js').StateVector} x0    — estado inicial {IHG, NTI, R, IAD, ETE}
 * @param {object} params                            — override de parámetros (opcional)
 * @param {string|number} seed                       — seed para reproducibilidad
 * @param {number} T                                 — horizonte de simulación (unidades de tiempo)
 * @param {number} dt                                — paso de integración
 * @returns {{ trajectory: Array, finalMetrics: object }}
 */
export function simulate(x0, params = {}, seed = 42, T = 30, dt = 0.1) {
  const p = { ...PARAMS_DEFAULT, ...params }
  const rand = seededRandom(seed)

  // LDI inicial: "carga acumulada" = inverso de R inicial * T
  let LDI = (1 - x0.R) * T * 0.5

  let state = {
    IHG: x0.IHG,
    NTI: x0.NTI,
    R: x0.R,
    IAD: x0.IAD,
    ETE: x0.ETE,
  }

  // Targets para IAD y ETE (derivan del estado inicial + control)
  const IAD_target = clamp(x0.IAD * 1.2, 0, 1)
  const ETE_target = clamp(x0.ETE * 1.15, 0, 1)

  const trajectory = []
  const steps = Math.round(T / dt)

  // Guardar estado inicial
  trajectory.push({ t: 0, ...computeMetrics(state) })

  for (let i = 0; i < steps; i++) {
    const t = i * dt
    const noise = (rand() - 0.5) * 2 * p.sigma * dt

    // RK4
    const k1 = derivatives(state, t, LDI, p, IAD_target, ETE_target)
    const s2 = addScaled(state, k1, dt / 2)
    const k2 = derivatives(s2, t + dt / 2, LDI, p, IAD_target, ETE_target)
    const s3 = addScaled(state, k2, dt / 2)
    const k3 = derivatives(s3, t + dt / 2, LDI, p, IAD_target, ETE_target)
    const s4 = addScaled(state, k3, dt)
    const k4 = derivatives(s4, t + dt, LDI, p, IAD_target, ETE_target)

    // Paso RK4 con ruido solo en IHG (más realista)
    state = {
      IHG: clamp(state.IHG + (dt / 6) * (k1.IHG + 2 * k2.IHG + 2 * k3.IHG + k4.IHG) + noise, -1.5, 1.5),
      NTI: clamp(state.NTI + (dt / 6) * (k1.NTI + 2 * k2.NTI + 2 * k3.NTI + k4.NTI), 0, 2),
      R:   clamp(state.R   + (dt / 6) * (k1.R   + 2 * k2.R   + 2 * k3.R   + k4.R),   0, 1.5),
      IAD: clamp(state.IAD + (dt / 6) * (k1.IAD + 2 * k2.IAD + 2 * k3.IAD + k4.IAD), 0, 1),
      ETE: clamp(state.ETE + (dt / 6) * (k1.ETE + 2 * k2.ETE + 2 * k3.ETE + k4.ETE), 0, 1),
    }

    // LDI decrece con el tiempo (recuperación natural)
    LDI = Math.max(0, LDI - 0.85 * dt)

    // Guardar punto cada ~1 unidad de tiempo (evitar array enorme)
    if (i % Math.max(1, Math.round(1 / dt)) === 0) {
      trajectory.push({ t: round2(t + dt), ...computeMetrics(state) })
    }
  }

  const finalMetrics = computeMetrics(state)

  return { trajectory, finalMetrics }
}

// ---- ODE: derivadas del sistema ----
function derivatives(s, t, LDI, p, IAD_target, ETE_target) {
  const { IHG, NTI, R, IAD, ETE } = s

  // Control Pontryagin: u = -K * (IHG - IHG_TARGET)
  const K = Math.sqrt(CONTROL_ALPHA1 / CONTROL_ALPHA2)
  const u = -K * (IHG - IHG_TARGET)

  const dIHG = -p.alpha * IHG
    + p.beta * NTI * R * (1 - Math.abs(IHG))
    - p.kappa * LDI
    + u

  const dNTI = -p.delta * NTI
    + 0.25 * IHG * (1 - NTI * NTI)
    - p.mu * Math.max(0, LDI - 0.5)

  const dR = -p.eta * R + p.theta * IHG * NTI

  const dIAD = p.gammaIAD * (IAD_target - IAD)
  const dETE = p.gammaETE * (ETE_target - ETE)

  return { IHG: dIHG, NTI: dNTI, R: dR, IAD: dIAD, ETE: dETE }
}

function addScaled(s, ds, h) {
  return {
    IHG: s.IHG + ds.IHG * h,
    NTI: s.NTI + ds.NTI * h,
    R:   s.R   + ds.R   * h,
    IAD: s.IAD + ds.IAD * h,
    ETE: s.ETE + ds.ETE * h,
  }
}

function clamp(v, min, max) {
  if (!isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

function round2(v) {
  return Math.round(v * 100) / 100
}
