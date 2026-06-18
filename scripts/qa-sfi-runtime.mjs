#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const HOST = process.env.QA_HOST ?? 'http://localhost:3000'
const TIMEOUT = Number(process.env.QA_TIMEOUT_MS ?? 5000)

const ROUTES = [
  '/api/root/state',
  '/api/sfi/operational-state',
  '/api/amv/state',
  '/api/worldspect/state',
  '/api/worldspect/vector',
  '/api/sfi/events',
  '/api/scorefriction/state',
]

function timeoutFetch(url, opts = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT)
  return fetch(url, { signal: controller.signal, ...opts })
    .finally(() => clearTimeout(id))
}

function classify(result) {
  if (result.networkError) return 'BLOCKED'
  if (result.status !== 200) return 'BLOCKED'
  if (result.json && typeof result.json.ok === 'boolean') {
    if (result.json.ok === true) return 'OK'
    return 'DEGRADED'
  }
  // default to DEGRADED when 200 but no ok flag
  return result.status === 200 ? 'DEGRADED' : 'BLOCKED'
}

function detectSignals(body, route) {
  const d = {
    fallback_local_active: false,
    supabaseOk_false: false,
    lastWriteError: false,
    worldspect_unavailable: false,
    sourceTrust_degraded: false,
    evidence_count_zero: false,
    latest_observation_null: false,
    latest_vectors_null: false,
    mock: false,
    fixture: false,
    sandbox: false,
    manual_test: false,
  }

  if (!body || typeof body !== 'object') return d

  // common patterns
  if (body.storage && typeof body.storage === 'object') {
    if (body.storage.fallback || body.storage.supabaseOk === false) d.fallback_local_active = true
    if (body.storage.supabaseOk === false) d.supabaseOk_false = true
  }

  // last write error heuristics
  if (body.lastWriteError || body.last_write_error || body.lastSfiSupabaseWriteError) d.lastWriteError = true

  // world spect specifics
  if (route.includes('worldspect')) {
    if (Array.isArray(body.warnings) && body.warnings.includes('worldspect_state_missing')) d.worldspect_unavailable = true
    if (body.sourceTrust === 'degraded' || (body.sources && Array.isArray(body.sources) && body.sources.length === 0)) d.sourceTrust_degraded = true
    if (!body.latest_vectors && !body.data && !body.wsi) d.latest_vectors_null = true
    if (!body.latestObservation && !body.latest_observation && !body.observed_at) d.latest_observation_null = true
  }

  // sfi specific
  if (route.includes('/sfi/operational-state') || route.includes('/sfi')) {
    if (body.eventCount === 0 || (body.events && Array.isArray(body.events) && body.events.length === 0)) d.evidence_count_zero = true
    if (body.storage && body.storage.supabaseEventCount === 0) d.evidence_count_zero = true
  }

  // amv / scorefriction specifics
  if (route.includes('/amv') || route.includes('scorefriction')) {
    if (body.scopes && Array.isArray(body.scopes) && body.scopes.length === 0) d.latest_observation_null = true
  }

  function collectRelevantObjects(value) {
    if (!value || typeof value !== 'object') return []
    const roots = []
    if (value.latestReading && typeof value.latestReading === 'object') roots.push(value.latestReading)
    if (value.selectedContext && typeof value.selectedContext === 'object') roots.push(value.selectedContext)
    if (value.payload && typeof value.payload === 'object') roots.push(value.payload)
    if (value.storage && typeof value.storage === 'object') roots.push(value.storage)
    if (Array.isArray(value.events)) roots.push(...value.events.filter((item) => item && typeof item === 'object'))
    if (value.latestReading?.payload && typeof value.latestReading.payload === 'object') roots.push(value.latestReading.payload)
    if (value.selectedContext?.latest_event && typeof value.selectedContext.latest_event === 'object') roots.push(value.selectedContext.latest_event)
    if (value.selectedContext?.latest_vectors && typeof value.selectedContext.latest_vectors === 'object') roots.push(value.selectedContext.latest_vectors)
    if (value.lastWriteError) roots.push({ lastWriteError: value.lastWriteError })
    return roots
  }

  function containsKeyword(value, regex) {
    if (value == null) return false
    if (typeof value === 'string') return regex.test(value)
    if (typeof value === 'number' || typeof value === 'boolean') return false
    if (Array.isArray(value)) return value.some((item) => containsKeyword(item, regex))
    if (typeof value === 'object') {
      return Object.values(value).some((item) => containsKeyword(item, regex))
    }
    return false
  }

  const relevantRoots = collectRelevantObjects(body)
  const sandboxPresent = relevantRoots.some((root) => containsKeyword(root, /sandbox/i))
  const manualTestPresent = relevantRoots.some((root) => containsKeyword(root, /manual_test|manual/i))

  if (body.manual_test === true || body.selectedContext?.manual_test === true || manualTestPresent) d.manual_test = true
  if (body.sandbox === true || body.selectedContext?.sandbox === true || sandboxPresent) d.sandbox = true

  return d
}

async function probe(route) {
  const url = `${HOST}${route}`
  try {
    const res = await timeoutFetch(url)
    const status = res.status
    let json = null
    try { json = await res.json() } catch (e) { json = null }
    const result = { route, url, ok: res.ok, status, json }
    result.classification = classify(result)
    result.detections = detectSignals(json, route)
    return result
  } catch (err) {
    const networkError = err && err.name === 'AbortError' ? 'timeout' : String(err)
    return { route, url, ok: false, status: null, json: null, networkError, classification: 'BLOCKED', detections: {} }
  }
}

async function main() {
  const results = []
  for (const r of ROUTES) {
    // allow querying amv state root paramless which returns all scopes
    const res = await probe(r)
    results.push(res)
  }

  const out = { generated_at: new Date().toISOString(), host: HOST, timeout_ms: TIMEOUT, results }

  const docsDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true })

  // write JSON
  const jsonPath = path.join(docsDir, 'QA_RUNTIME_REPORT.json')
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf8')

  // write markdown
  const mdPath = path.join(docsDir, 'QA_RUNTIME_REPORT.md')
  const lines = []
  lines.push('# QA Runtime Report')
  lines.push('')
  lines.push(`Generated: ${out.generated_at}`)
  lines.push('')
  lines.push('| Route | URL | Classification | Notes | Detections |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const r of out.results) {
    const notes = r.networkError ? r.networkError : r.json && typeof r.json.ok === 'boolean' ? `ok:${r.json.ok}` : ''
    const det = r.detections && Object.entries(r.detections).filter(([k,v])=>v).map(([k])=>k).join(', ') || ''
    lines.push(`| ${r.route} | ${r.url} | ${r.classification} | ${notes} | ${det} |`)
  }

  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8')

  console.log('Wrote', jsonPath, mdPath)
  console.log(JSON.stringify(out, null, 2))
}

main().catch((err) => { console.error('QA script failed', err); process.exit(1) })
