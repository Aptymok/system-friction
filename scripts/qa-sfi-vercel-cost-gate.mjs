import assert from 'node:assert/strict';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.equal(config?.git?.deploymentEnabled, false, 'automatic Vercel Git deployments must remain globally disabled');

const workflow = fs.readFileSync('.github/workflows/sfi-vercel-prebuilt-production.yml', 'utf8');
assert.match(workflow, /\.github\/sfi-production-deploy-trigger/, 'production deployment must remain trigger-gated');
assert.match(workflow, /workflow_dispatch:/, 'production deployment may be explicitly dispatched');
assert.doesNotMatch(workflow, /branches:\s*\[?main\]?\s*$/m, 'production deploy must not be an ordinary main-push workflow');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-VERCEL-COST-GATE-1.0',
  automaticGitDeployments: false,
  productionDeployment: 'EXPLICIT_TRIGGER_ONLY',
}, null, 2));
