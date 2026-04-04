/**
 * API client — SystemFriction v2
 * Base is resolved from env (VITE_API_BASE) and defaults to same-origin.
 */

const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
export const API_BASE = BASE
const TIMEOUT = 6000

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), opts.timeout ?? TIMEOUT)
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(id)
    return r
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

/** Check backend health. Returns true if online. */
export async function checkHealth() {
  try {
    const r = await fetchWithTimeout(`${BASE}/health`, { timeout: 3000 })
    return r.ok
  } catch { return false }
}

/**
 * POST /api/metrics — persist a MIHM + Ψ snapshot.
 * Fire-and-forget; never throws.
 */
export async function postMetrics({ mihm, psi, tick = 0 }) {
  try {
    await fetchWithTimeout(`${BASE}/api/metrics`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ts: new Date().toISOString(), tick, mihm, psi }),
      timeout: 5000,
    })
  } catch { /* non-blocking */ }
}

/**
 * GET /api/commits — real GitHub commits for Aptymok/system-friction.
 * Returns [] on error.
 */
export async function fetchCommits() {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/commits`, { timeout: 6000 })
    const d = await r.json()
    return d.commits ?? []
  } catch { return [] }
}

/**
 * POST /api/llm/narrative — get narrative response from Eidolón.
 * Falls back to null (caller uses local heuristic).
 */
export async function fetchNarrative({ text, mihm, psi, context = '' }) {
  try {
    const r = await fetchWithTimeout(`${BASE}/api/llm/narrative`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, mihm, psi, context }),
      timeout: 10000,
    })
    const d = await r.json()
    return d.narrative ?? null
  } catch { return null }
}

/**
 * Aggregate social + market endpoints for matrix rendering.
 */
export async function fetchSocialAudit(query = 'viral') {
  const headers = { 'Content-Type': 'application/json' }
  const urls = [
    `${BASE}/spotify/trends?genre=pop&limit=10`,
    `${BASE}/tiktok/scrape?query=${encodeURIComponent(query)}`,
    `${BASE}/nasa?refresh=1`,
    `${BASE}/macro?refresh=1`,
  ]
  const out = await Promise.all(urls.map(async (u) => {
    const r = await fetchWithTimeout(u, { headers, timeout: 10000 })
    return r.json()
  }))
  return {
    spotify: out[0],
    tiktok: out[1],
    nasa: out[2],
    macro: out[3],
  }
}
