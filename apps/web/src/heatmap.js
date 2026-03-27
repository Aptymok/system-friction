/**
 * Heatmap 32×32 renderer + Retro Mode B — SystemFriction v2
 *
 * Retro Mode B (ORDEN EXACTO OBLIGATORIO):
 *   1) inversión
 *   2) perturbación (jitter + scanlines + noise)
 *   3) phi inversion (curva no lineal sobre luminancia)
 *
 * Determinista por seed.
 */

const SIZE = 32
const PSI_KEYS = ['A', 'P', 'C', 'T', 'N', 'S', 'R', 'X']

/**
 * Render heatmap from Ψ state to an RGBA ImageData-compatible buffer.
 * @param {Object} psiState - {A,P,C,T,N,S,R,X}
 * @param {{retro?: boolean, seed?: number}} options
 * @returns {{rgba: Uint8ClampedArray, size: number}}
 */
export function renderHeatmap32(psiState, options = {}) {
  const { retro = false, seed = 42 } = options
  const rng = lcg(seed)

  // Build 32×32 float grid
  const data = new Float32Array(SIZE * SIZE)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Map x/y regions to pairs of Ψ keys — creates a heatmap "landscape"
      const kx = Math.floor(x / (SIZE / PSI_KEYS.length)) % PSI_KEYS.length
      const ky = Math.floor(y / (SIZE / PSI_KEYS.length)) % PSI_KEYS.length
      const vx = psiState[PSI_KEYS[kx]] ?? 0.5
      const vy = psiState[PSI_KEYS[ky]] ?? 0.5

      // Blend + micro-noise from seeded RNG
      const base = (vx * 0.6 + vy * 0.4)
      const noise = (rng() - 0.5) * 0.09
      data[y * SIZE + x] = clamp(base + noise, 0, 1)
    }
  }

  if (retro) {
    applyRetroModeB(data, rng)
  }

  return { rgba: dataToRGBA(data), size: SIZE }
}

/**
 * Draw the heatmap onto a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} psiState
 * @param {{retro?: boolean, seed?: number, scale?: number}} options
 */
export function drawHeatmap(canvas, psiState, options = {}) {
  const { scale = 8 } = options
  const { rgba, size } = renderHeatmap32(psiState, options)

  canvas.width = size * scale
  canvas.height = size * scale

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  // Draw 1:1 on offscreen canvas
  const offscreen = document.createElement('canvas')
  offscreen.width = size
  offscreen.height = size
  const octx = offscreen.getContext('2d')
  const imgData = octx.createImageData(size, size)
  imgData.data.set(rgba)
  octx.putImageData(imgData, 0, 0)

  // Scale up with nearest-neighbor
  ctx.drawImage(offscreen, 0, 0, size * scale, size * scale)
}

// ── Retro Mode B ──────────────────────────────────────────────────────────────

function applyRetroModeB(data, rng) {
  // Step 1: Inversión — flip all values
  for (let i = 0; i < data.length; i++) {
    data[i] = 1 - data[i]
  }

  // Step 2: Perturbación — jitter + scanlines + analog noise
  for (let y = 0; y < SIZE; y++) {
    // Scanline darkening every 3rd row
    const scanlineDrop = y % 3 === 0 ? 0.1 : 0
    // Horizontal jitter band
    const bandShift = (rng() - 0.5) * 0.06

    for (let x = 0; x < SIZE; x++) {
      const jitter = (rng() - 0.5) * 0.14
      const idx = y * SIZE + x
      data[idx] = clamp(data[idx] + jitter + bandShift - scanlineDrop, 0, 1)
    }
  }

  // Step 3: Phi inversion — non-linear luminance curve (φ-sigmoid)
  for (let i = 0; i < data.length; i++) {
    data[i] = clamp(phiCurve(data[i]), 0, 1)
  }
}

/**
 * φ-curve: golden-ratio-parameterized sigmoid over [0,1].
 * Emphasizes midtones, compresses extremes.
 */
function phiCurve(t) {
  const phi = 1.6180339887
  // Map t to [-π, π] range, apply phi-sigmoid
  const x = (t * 2 - 1) * Math.PI * phi
  return 1 / (1 + Math.exp(-x / phi))
}

// ── Color mapping ─────────────────────────────────────────────────────────────

/**
 * Map float [0,1] data to EIDELON RGBA palette:
 *   0.00-0.25: --void → --bg2  (near-black blues)
 *   0.25-0.50: --bg2  → --azul (deep blue)
 *   0.50-0.75: --azul → --oro  (gold)
 *   0.75-1.00: --oro  → --neon (yellow-green)
 */
function dataToRGBA(data) {
  const rgba = new Uint8ClampedArray(data.length * 4)

  for (let i = 0; i < data.length; i++) {
    const v = data[i]
    let r, g, b

    if (v < 0.25) {
      const t = v / 0.25
      r = lerp(5, 20, t)
      g = lerp(5, 20, t)
      b = lerp(5, 30, t)
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25
      r = lerp(20, 42, t)
      g = lerp(20, 111, t)
      b = lerp(30, 170, t)
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25
      r = lerp(42, 200, t)
      g = lerp(111, 169, t)
      b = lerp(170, 81, t)
    } else {
      const t = (v - 0.75) / 0.25
      r = lerp(200, 230, t)
      g = lerp(169, 255, t)
      b = lerp(81, 0, t)
    }

    const j = i * 4
    rgba[j] = Math.round(r)
    rgba[j + 1] = Math.round(g)
    rgba[j + 2] = Math.round(b)
    rgba[j + 3] = 255
  }

  return rgba
}

// ── Internals ─────────────────────────────────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, mn, mx) { return Math.min(mx, Math.max(mn, isNaN(v) ? mn : v)) }

function lcg(seed) {
  let s = (seed | 0) >>> 0
  return () => {
    s = ((1664525 * s + 1013904223) >>> 0)
    return s / 2 ** 32
  }
}
