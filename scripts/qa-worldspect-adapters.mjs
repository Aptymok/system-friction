const BASE = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function readJson(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  return { status: response.status, json };
}

const ingest = await readJson('/api/cron/worldspect', { method: 'GET' });
const operational = await readJson('/api/worldspect/operational-state', { method: 'GET' });

const sourceHealth = operational.json.source_health || [];
const realInputs = sourceHealth.filter((item) => item.health === 'real input');
const unavailable = sourceHealth.filter((item) => item.health !== 'real input');

console.log(JSON.stringify({
  ingest: {
    status: ingest.status,
    ok: ingest.json.ok,
    writesPerformed: ingest.json.writesPerformed,
    degraded_sources: ingest.json.degraded_sources || ingest.json.degradedSources || [],
  },
  operational: {
    status: operational.status,
    ok: operational.json.ok,
    source_health: sourceHealth,
    realInputCount: realInputs.length,
    missingOrDegradedCount: unavailable.length,
    sourceCoverage: operational.json.snapshot?.sourceCoverage ?? null,
  },
}, null, 2));

if (!ingest.json.ok) process.exitCode = 1;
if (!operational.json.ok) process.exitCode = 1;
if (realInputs.length < 6) {
  console.error(`Expected at least 6 real-input WorldSpect domains, received ${realInputs.length}.`);
  process.exitCode = 1;
}
