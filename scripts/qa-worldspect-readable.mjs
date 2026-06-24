const base = process.env.SFI_BASE_URL || 'http://127.0.0.1:3000';

async function readJson(path) {
  const response = await fetch(`${base}${path}`, { cache: 'no-store' });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} did not return JSON: ${text.slice(0, 200)}`);
  }
  return { status: response.status, json };
}

const operational = await readJson('/api/worldspect/operational-state');
const sourceHealth = Array.isArray(operational.json.source_health) ? operational.json.source_health : [];
const details = sourceHealth.flatMap((item) => Array.isArray(item.source_details) ? item.source_details : []);
const sourceMix = operational.json.source_mix || {};
const failures = [];

if (operational.status !== 200) failures.push(`operational status ${operational.status}`);
if (operational.json.ok !== true) failures.push('operational ok=false');
if (!sourceHealth.length) failures.push('source_health empty');
if (!details.length) failures.push('source_details empty');
if (!sourceHealth.every((item) => Array.isArray(item.sources))) failures.push('sources is not array for every domain');
if (!details.every((item) => typeof item.label === 'string' && item.label.length > 0)) failures.push('source detail labels missing');
if (!details.every((item) => typeof item.kind === 'string' && item.kind.length > 0)) failures.push('source detail kind missing');
if (Number(sourceMix.sourceCoverage ?? 0) < 0.6) failures.push(`sourceCoverage too low: ${sourceMix.sourceCoverage}`);

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  sourceCoverage: sourceMix.sourceCoverage,
  sourceMix,
  sourceHealth: sourceHealth.map((item) => ({
    vector: item.vector,
    health: item.health,
    source_count: item.source_count,
    sources: item.sources,
    source_details: item.source_details,
    interpretation: item.interpretation,
  })),
}, null, 2));

if (failures.length) process.exit(1);
