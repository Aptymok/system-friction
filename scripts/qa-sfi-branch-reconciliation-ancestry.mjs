/**
 * 43 -> 2 SFI reconciliation. Prove every removed branch tip remains an
 * ancestor of the current integration branch without executing, resetting,
 * merging, deleting or contacting production. Git checkout requires full
 * history (fetch-depth: 0). Historical reachability does NOT imply
 * functional equivalence, deployment or authorization.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';

const historicalHeads = [
  ['adaptive-attractor','7599044dd793'],
  ['attractor-72h','067e0dc2aee4'],
  ['institutional-evolution','924a5de17f1f'],
  ['generated-intake','5eaf7c5802ea'],
  ['method-lab-dossier','97b89b07cd8e'],
  ['possibility-field','0e80c7fdede8'],
  ['private-reconcile','71a7a8c41691'],
  ['research-assurance','41ed88e344e1'],
  ['synthetic-review','4ec90f521b2f'],
  ['chronos-receipt','7dd3335b9768'],
  ['discovery-opportunity','5b3fb6a98bff'],
  ['access-auth','5e37124bfb1b'],
  ['sedimentation-gates','ee140872ce4d'],
  ['evidence-provenance','9be5dcf27d5e'],
  ['material-action-boundary','0004a9ef3e48'],
  ['assurance-ci','f122f52de72b'],
  ['discovery-p8','f1871a5a15d1'],
  ['outbox-drain','ebc34b84bc60'],
  ['return-contrast-sql','892b704bbbf6'],
  ['method-lab-evidence','4fa0ff88f80c'],
  ['cognitive-llm-off','b849f7ac895c'],
  ['membership-recovery','a441b9d1f0bc'],
  ['lab-disclosure','1dcc08a98446'],
  ['paged-fingerprints','eeaf22aca579'],
  ['schedule-projection','32a5cbb3998a'],
  ['world-evidence-adjudication','6a1e4cd775d7'],
  ['world-resume','12b12c654e5a'],
  ['world-cooldown','0b429c49d455'],
  ['world-repeat-retry','c7a7741abb7e'],
  ['journal-drain','002c63c0ee39'],
  ['return-idempotency','ff1bd1fd9e13'],
  ['release-outbox','6bdbed97f6f3'],
  ['release-tenant','d7159ebefcdf'],
  ['release-return','95f4aeea0371'],
  ['release-lab-security','148047519606'],
  ['release-assurance','c7e0283c2ea5'],
  ['reality-inspector','2ea7fa643259'],
  ['governed-ingestion','ec10d02f7be7'],
  ['reality-integrity','3ea76325afba'],
  ['reality-multitenant-sync','59261c5074de'],
  ['timeline-projects','b9ae405f1311'],
];
assert.equal(historicalHeads.length,41);
const run=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const current=run('rev-parse','HEAD');
for(const [name,sha] of historicalHeads) {
  const full=run('rev-parse',sha+'^{commit}');
  assert.match(full,/^[0-9a-f]{40}$/);
  try {run('merge-base','--is-ancestor',full,current);}
  catch {throw new Error('RECONCILIATION_ARCHIVE_HEAD_NOT_PRESERVED:'+name+':'+full);}
}
const manifest='docs/operations/SFI_BRANCH_RECONCILIATION_43_20261024.md';
assert.ok(existsSync(manifest),'missing per-branch ledger');
const inventory=readFileSync(manifest,'utf8');
assert.match(inventory,/43 de 43/);
assert.match(inventory,/43 → 2/);
for(const path of [
  'src/lib/discovery/opportunityResearchCycle.ts',
  'src/lib/world-observatory/hypothesisRetryGuard.ts',
  'docs/architecture/sfi/REALITY-CHAIN-GOVERNED-INGESTION-BOUNDARY.md',
])assert.ok(existsSync(path),'missing recovered source '+path);
for(const path of [
  'src/app/api/cron/world-observatory/route.ts',
  'src/app/api/external/v1/world/route.ts',
]) {
  const text=readFileSync(path,'utf8');
  assert.match(text,/assessWorldRepeatRetryGuard\(/);
  assert.match(text,/HYPOTHESIS_RETRY_SUSPENDED_UNCHANGED_OBSERVATIONS/);
}
assert.ok(!existsSync('.github/workflows/sfi-verified-branch-cleanup.yml'),
  'One-time destructive cleanup workflow must remain removed');
console.log('PASS SFI_BRANCH_RECONCILIATION: all 41 deleted branch heads reachable, selected safe features wired, 43-branch ledger retained; no functional certification implied');
