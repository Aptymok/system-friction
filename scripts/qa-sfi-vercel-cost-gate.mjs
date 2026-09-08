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
assert.match(pushSection, /^    paths:\n      - ['"]\.github\/sfi-production-deploy-trigger['"]$/m, 'production deployment must remain restricted to the dedicated marker path');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-VERCEL-COST-GATE-1.1',
  automaticGitDeployments: false,
  productionDeployment: 'EXPLICIT_TRIGGER_ONLY',
  productionPushPath: '.github/sfi-production-deploy-trigger',
}, null, 2));
