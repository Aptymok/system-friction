import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.equal(config?.git?.deploymentEnabled, false, 'automatic Vercel Git deployments must remain globally disabled');

const workflow = fs.readFileSync('.github/workflows/sfi-vercel-prebuilt-production.yml', 'utf8');
assert.match(workflow, /workflow_dispatch:/, 'production deployment may be explicitly dispatched');

const pushSection = workflow.match(/\n  push:\n([\s\S]*?)(?=\n  workflow_dispatch:)/)?.[1];
assert.ok(pushSection, 'production workflow must retain an explicit push trigger section');
assert.match(pushSection, /^    branches:\n      - main$/m, 'production push trigger must remain main-only');
const pathRows = pushSection
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('- '))
  .map((line) => line.slice(2).replace(/^['"]|['"]$/g, ''));
assert.deepEqual(
  pathRows,
  ['main', '.github/sfi-production-deploy-trigger'],
  'production push trigger must contain only main plus the dedicated release marker path',
);
assert.match(
  pushSection,
  /^    paths:\n      - ['"]?\.github\/sfi-production-deploy-trigger['"]?$/m,
  'production deployment must remain restricted to the dedicated marker path',
);


const publicWorld = fs.readFileSync('src/app/api/observatory/world/route.ts', 'utf8');
const publicState = fs.readFileSync('src/app/api/observatory/state/route.ts', 'utf8');
const publicTimelineRoute = fs.readFileSync('src/app/api/observatory/timeline/route.ts', 'utf8');
const publicTimelineReader = fs.readFileSync('src/lib/observatory/public/worldSnapshotTimeline.ts', 'utf8');
const publicLibrary = fs.readFileSync('src/app/library/page.tsx', 'utf8');
const publicObservatoryClient = fs.readFileSync('src/components/sfi/ObservatoryConsole.tsx', 'utf8');

for (const [name, source] of [
  ['observatory/world', publicWorld],
  ['observatory/state', publicState],
  ['observatory/timeline', publicTimelineRoute],
  ['library', publicLibrary],
]) {
  assert.match(source, /force-static/, `${name} must not fan out to Supabase on every public request`);
  assert.doesNotMatch(source, /force-dynamic/, `${name} must not bypass the public cache`);
}

assert.match(publicWorld, /export const revalidate=300;/, 'public world read must use bounded ISR');
assert.match(publicWorld, /const LIMIT=240;/, 'public world database fanout must remain row-bounded');
assert.match(publicState, /export const revalidate = 300;/, 'public state read must use bounded ISR');
assert.match(publicTimelineRoute, /export const revalidate = 900;/, 'public timeline read must use bounded ISR');
assert.match(publicLibrary, /export const revalidate = 900;/, 'public Library graph projection must use bounded ISR');
assert.match(publicTimelineReader, /const MAX_FRAMES = 180;/, 'public timeline must have a hard persisted-frame cap');
assert.doesNotMatch(publicTimelineReader, /for \(;;\)/, 'public timeline may not page through the full persisted history');
assert.doesNotMatch(publicObservatoryClient, /cache:\s*['"]no-store['"]/, 'public Observatory client may not force cache bypass');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-VERCEL-COST-GATE-1.2',
  automaticGitDeployments: false,
  productionDeployment: 'EXPLICIT_TRIGGER_ONLY',
  productionPushPath: '.github/sfi-production-deploy-trigger',
  publicSupabaseReadPolicy: 'CACHED_AND_BOUNDED',
}, null, 2));
