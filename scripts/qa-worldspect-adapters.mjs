const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function readJson(path, init) {
  const response = await fetch(`${base}${path}`, init);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} returned non-json: ${text.slice(0, 200)}`);
  }
  return { status: response.status, json };
}

const ingest = await readJson('/api/worldspect/ingest', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ includePublicAdapters: true }),
});

const operational = await readJson('/api/worldspect/operational-state');

console.log(JSON.stringify({
  ingest: {
    status: ingest.status,
    ok: ingest.json.ok,
    writesPerformed: ingest.json.persistence?.ok ?? false,
    degraded_sources: ingest.json.degraded_sources ?? [],
  },
  operational: {
    status: operational.status,
    ok: operational.json.ok,
    source_health: operational.json.source_health,
    sourceCoverage: operational.json.snapshot?.sourceCoverage,
  },
}, null, 2));