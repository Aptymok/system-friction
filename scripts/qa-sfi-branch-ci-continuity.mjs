/**
 * SFI no-PR continuity contract. No GitHub API, no deployment, no secrets.
 * A feature-branch push MUST run real CI without a pull request; workflows
 * carrying privileged production operations remain main-only.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(name,'utf8');
const branch = 'work/reality-chain-integration-20261024';
const configs = [
  '.github/workflows/sfi-verify.yml',
  '.github/workflows/mihmt-timeline-clocks-review.yml',
  '.github/workflows/reality-chain-postgres-concurrency.yml',
];
for(const path of configs){
  const w=read(path);
  const header=w.split('\npermissions:')[0];
  assert.match(header,/\bon:\s*\n\s*push:/,'push trigger required: '+path);
  assert.ok(header.includes(branch),'canonical no-PR branch missing: '+path);
  assert.match(header,/workflow_dispatch:/,'manual verification required: '+path);
  assert.match(w,/permissions:\s*\n\s*contents: read/,'read-only GITHUB_TOKEN required: '+path);
  assert.ok(!/permissions:\s*\n\s*contents: write/.test(w),'CI must not write contents: '+path);
}
const verify=read(configs[0]);
assert.match(verify,/\s- main\s*\n\s*- work\/reality-chain-integration-20261024/);
assert.match(verify,/npm run typecheck/);
assert.match(verify,/npm run build/);
assert.match(verify,/name: Verify Studio audio gates/);
assert.match(verify,/qa-sfi-branch-ci-continuity\.mjs/);
const postgres=read(configs[2]);
assert.match(postgres,/postgres:17/);
assert.match(postgres,/127\.0\.0\.1:5432\/sfi_rc_test/);
assert.match(postgres,/qa-real-postgres-concurrency\.mjs/);
assert.match(postgres,/qa-two-database-mirror-replay\.mjs/);
const timeline=read(configs[1]);
assert.match(timeline,/qa-sfi-timeline-case-project-attractor\.mjs/);
assert.match(timeline,/npm run typecheck/);
const continuity=read('.github/workflows/sfi-continuity-hourly.yml');
assert.match(continuity,/workflow_run\.head_branch == 'main'/,
  'downstream production reconciliation must remain explicitly main-only');
const completion=read('.github/workflows/sfi-program-completion.yml');
assert.match(completion,/workflow_run\.head_branch == 'main'/,
  'completion controller must remain main-only');
console.log('PASS SFI_NO_PR_BRANCH_CI: 3 read-only workflows, branch push and manual dispatch, production downstream main-only');
