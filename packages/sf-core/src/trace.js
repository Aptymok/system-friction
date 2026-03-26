/**
 * sf-core/trace.js
 * Trazabilidad radical: hash de inputs, seed determinista, versionado.
 */

export const ENGINE_VERSION = '2.0.0'

/**
 * Genera un hash SHA-256 hex de cualquier valor serializable.
 * Usa SubtleCrypto (Web Crypto API, disponible en Node 18+ y browsers).
 * @param {*} data — cualquier valor JSON-serializable
 * @returns {Promise<string>} hex SHA-256
 */
export async function hashInputs(data) {
  const json = stableStringify(data)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(json)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Genera un hash SHA-256 de forma síncrona para entornos que no tienen
 * SubtleCrypto (fallback con djb2 + hex, menos criptográfico pero estable).
 * @param {*} data
 * @returns {string}
 */
export function hashInputsSync(data) {
  const json = stableStringify(data)
  return djb2Hex(json)
}

/**
 * Serialización estable (keys ordenadas) para hashing reproducible.
 * @param {*} value
 * @returns {string}
 */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']'
  }
  const keys = Object.keys(value).sort()
  const pairs = keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k]))
  return '{' + pairs.join(',') + '}'
}

/**
 * Genera seed determinista a partir de un CognitiveSnapshot.
 * El seed es un string reproducible: no depende de Date.now(), solo de los datos.
 * @param {import('./types.js').CognitiveSnapshot} snapshot
 * @returns {string}
 */
export function snapshotToSeed(snapshot) {
  // Usamos solo los campos "estables" (no el timestamp que varía)
  const stable = {
    valence: roundTo(snapshot.valence, 4),
    arousal: roundTo(snapshot.arousal, 4),
    tension: roundTo(snapshot.tension, 4),
    focus: roundTo(snapshot.focus, 4),
    textLen: (snapshot.text || '').length,
  }
  return hashInputsSync(stable)
}

/**
 * LCG (Linear Congruential Generator) con seed numérico.
 * Retorna función rand() que genera floats [0, 1) de forma determinista.
 * @param {number|string} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let s = typeof seed === 'string' ? stringToInt(seed) : (seed | 0)
  // LCG params estándar (Numerical Recipes)
  const a = 1664525
  const c = 1013904223
  const m = 2 ** 32

  return function rand() {
    s = ((a * s + c) >>> 0)  // unsigned 32-bit
    return s / m
  }
}

// ---- Internos ----

function djb2Hex(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0  // unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0')
}

function stringToInt(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h = h | 0
  }
  return h >>> 0
}

function roundTo(v, decimals) {
  const f = 10 ** decimals
  return Math.round(v * f) / f
}
