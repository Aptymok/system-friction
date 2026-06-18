#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const HOST = process.env.QA_HOST ?? 'http://localhost:3000'
const TIMEOUT = Number(process.env.QA_TIMEOUT_MS ?? 5000)

const ROUTES = [
  '/api/root/state',
  '/api/sfi/operational-state',
  '/api/graph/state?profile=sfi',
  '/api/worldspect/state',
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
  return result.status === 200 ? 'DEGRADED' : 'BLOCKED'
}

function detectSignals(body, route) {
  const d = {
    root_graph_missing: false,
    root_graph_degraded: false,
    scorefriction_evidence_missing: false,
    worldspect_missing: false,
    graph_degraded: false,
    auth_required: false,
    network_timeout: false,
  }

  if (!body || typeof body !== 'object') return d

  if (route.includes('/api/root/state')) {
    if (body.error === 'Unauthorized' || body.status === 401) d.auth_required = true
    if (body.data?.rootNeuralGraphRuntime) {
      const runtime = body.data.rootNeuralGraphRuntime
      if (runtime.status === 'missing') d.root_graph_missing = true
      if (runtime.status === 'degraded') d.root_graph_degraded = true
    }
  }

  if (route.includes('/api/sfi/operational-state')) {
    if (body.rootNeuralGraphRuntime) {
      if (body.rootNeuralGraphRuntime.status === 'missing') d.root_graph_missing = true
      if (body.rootNeuralGraphRuntime.status === 'degraded') d.root_graph_degraded = true
    }
    if (body.eventCount === 0 || (body.events && Array.isArray(body.events) && body.events.length === 0)) d.scorefriction_evidence_missing = true
  }

  if (route.includes('/api/worldspect/state')) {
    if (body.data?.sourceState === 'missing' || body.data?.sourceState === 'degraded') d.worldspect_missing = true
  }

  if (route.includes('/api/graph/state')) {
    if (body.data?.sourceState === 'graph_edges_empty' || body.warnings?.includes('graph_edges_empty')) d.graph_degraded = true
  }

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
    return { route, url, ok: false, status: null, json: null, networkError, classification: 'BLOCKED', detections: { network_timeout: true } }
  }
}

async function main() {
  const results = []
  for (const r of ROUTES) {
    const res = await probe(r)
    results.push(res)
  }

  const out = { generated_at: new Date().toISOString(), host: HOST, timeout_ms: TIMEOUT, results }
  const docsDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true })

  const jsonPath = path.join(docsDir, 'QA_SFI_CONVERGENCE_REPORT.json')
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2), 'utf8')

  const mdPath = path.join(docsDir, 'QA_SFI_CONVERGENCE_REPORT.md')
  const lines = []
  lines.push('# QA SFI Convergence Report')
  lines.push('')
  lines.push(`Generated: ${out.generated_at}`)
  lines.push('')
  lines.push('| Route | URL | Classification | Notes | Detections |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const r of out.results) {
    const notes = r.networkError ? r.networkError : r.json && typeof r.json.ok === 'boolean' ? `ok:${r.json.ok}` : ''
    const det = r.detections && Object.entries(r.detections).filter(([k, v]) => v).map(([k]) => k).join(', ') || ''
    lines.push(`| ${r.route} | ${r.url} | ${r.classification} | ${notes} | ${det} |`)
  }
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8')

  console.log('Wrote', jsonPath, mdPath)
  console.log(JSON.stringify(out, null, 2))
}

main().catch((err) => { console.error('QA convergence script failed', err); process.exit(1) })
