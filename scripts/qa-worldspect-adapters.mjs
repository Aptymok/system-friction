const base = process.env.SFI_QA_BASE_URL || 'http://127.0.0.1:3000'

async function readJson(path, init) {
  const response = await fetch(`${base}${path}`, init)
  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

const ingest = await readJson('/api/cron/worldspect')
const operational = await readJson('/api/worldspect/operational-state')

const sourceHealth = operational.json.source_health ?? []
const realInputCount = sourceHealth.filter((item) => item.health === 'real input').length
const missingOrDegradedCount = sourceHealth.filter((item) => item.health !== 'real input').length
const coverage = operational.json.snapshot?.sourceCoverage ?? operational.json.sourceCoverage ?? null

const institutional = sourceHealth.find((item) => item.vector === 'INSTITUTIONAL')
const tech = sourceHealth.find((item) => item.vector === 'TECH')
const cultural = sourceHealth.find((item) => item.vector === 'CULTURAL')

const snapshotVectors = operational.json.snapshot?.vectors ?? []
const saturatedInternal = snapshotVectors
  .filter((vector) => vector.source_count > 0)
  .filter((vector) => Number(vector.value) >= 0.98)
  .map((vector) => vector.domain)

const result = {
  ingest: {
    status: ingest.status,
    ok: ingest.json.ok,
    writesPerformed: ingest.json.writesPerformed,
    degraded_sources: ingest.json.degraded_sources ?? [],
  },
  operational: {
    status: operational.status,
    ok: operational.json.ok,
    source_health: sourceHealth,
    realInputCount,
    missingOrDegradedCount,
    sourceCoverage: coverage,
    checks: {
      techHasOwnBucket: Boolean(tech && tech.health === 'real input' && !String(institutional?.sources ?? '').includes('tech_')),
      culturalPresent: Boolean(cultural && cultural.health === 'real input'),
      saturatedInternal,
    },
  },
}

console.log(JSON.stringify(result, null, 2))

if (!ingest.json.ok || ingest.json.writesPerformed !== true) {
  process.exitCode = 1
}

if (realInputCount < 8) {
  console.error(`Expected at least 8 real input vectors, got ${realInputCount}`)
  process.exitCode = 1
}

if (saturatedInternal.length > 2) {
  console.error(`Too many saturated vectors after calibration: ${saturatedInternal.join(', ')}`)
  process.exitCode = 1
}