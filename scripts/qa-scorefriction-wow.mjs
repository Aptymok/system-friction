const base = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

async function json(path) {
  const response = await fetch(`${base}${path}`, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

const failures = [];
const world = await json('/api/worldspect/operational-state');

if (world.status !== 200 || world.body.ok !== true) failures.push('worldspect operational-state unavailable');
if ((world.body.source_mix?.sourceCoverage ?? 0) < 1) failures.push('worldspect sourceCoverage below 1');
if (!Array.isArray(world.body.vector_readout) || world.body.vector_readout.length < 10) failures.push('vector_readout missing or incomplete');

const institutional = world.body.source_health?.find?.((item) => item.vector === 'INSTITUTIONAL');
const tech = world.body.source_health?.find?.((item) => item.vector === 'TECH');
const institutionalSources = institutional?.sources ?? [];
const techSources = tech?.sources ?? [];

if (institutionalSources.some((source) => String(source).startsWith('tech_'))) failures.push('TECH sources leaked into INSTITUTIONAL bucket');
if (!techSources.some((source) => String(source).startsWith('tech_'))) failures.push('TECH bucket missing tech sources');

const page = await fetch(`${base}/scorefriction`, { cache: 'no-store' });
const html = await page.text();
if (page.status !== 200) failures.push('/scorefriction not reachable');
if (!html.includes('ScoreFriction')) failures.push('/scorefriction shell missing ScoreFriction marker');

console.log(JSON.stringify({
  ok: failures.length === 0,
  failures,
  sourceCoverage: world.body.source_mix?.sourceCoverage,
  sourceMix: world.body.source_mix,
  institutionalSources,
  techSources,
}, null, 2));

if (failures.length) process.exit(1);
