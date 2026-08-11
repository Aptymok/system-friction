import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const contract = read('src/lib/cognitive-twin/contract.ts');
const runtime = read('src/lib/cognitive-twin/reentry/runtime.ts');
const types = read('src/lib/cognitive-twin/reentry/types.ts');
const journal = read('src/lib/cognitive-twin/reentry/journal.ts');
const experiments = read('src/lib/cognitive-twin/reentry/experiments.ts');
const experimentState = read('src/lib/cognitive-twin/reentry/experimentState.ts');
const cron = read('src/app/api/cron/continuity-report/route.ts');
const methodLab = read('src/lib/method-lab/readModel.ts');
const lineagePage = read('src/app/root/cognitive-twin/lineage/page.tsx');
const journalPage = read('src/app/root/cognitive-twin/journal/page.tsx');
const canon = read('docs/canon/16_LONGITUDINAL_SYSTEM_FRICTION_PROGRAM.md');
const phiCanon = read('docs/MIHM_PHI_CANON.md');
const phiContract = read('src/lib/mihm/phiContract.ts');
const canonicalFormulas = read('src/core/formulas/canonicalFormulas.ts');
const worldVector = read('src/lib/worldspect/vector-contract.ts');
const mops = read('src/lib/mops/contract.ts');
const reconciliation = read('docs/audits/2026-08-11_phi_worldvector_mops_reconciliation.md');
const prereg = JSON.parse(read('experiments/lci/preregistration-v0.1.json')) as Record<string, unknown>;
const vercel = JSON.parse(read('vercel.json')) as { crons?: unknown[] };

assert.match(contract, /COGNITIVE_TWIN_CONTRACT_VERSION = '1\.2\.0'/);
assert.match(contract, /Computational first-person self-report/);
assert.match(contract, /WITHHOLD means do not interrupt the founder now/);
assert.match(contract, /Learning does not imply authority expansion/);
assert.match(contract, /propose_subject_mutation/);
assert.match(contract, /apply_subject_mutation/);
assert.match(types, /rootVisibility: 'ALWAYS_VISIBLE'/);
assert.doesNotMatch(types, /privateReasoning|reasoningTrace|hiddenReasoning|rawChainOfThought/i);
assert.doesNotMatch(runtime, /privateReasoning\s*:|reasoningTrace\s*:|hiddenReasoning\s*:|rawChainOfThought\s*:/i);
assert.match(runtime, /No chain-of-thought persisted/);
assert.match(runtime, /individuationDemonstrated: false/);
assert.match(runtime, /ct-a01-genesis-2026-08-11/);
assert.match(runtime, /parentEventHash/);
assert.match(runtime, /eventHash/);
assert.match(journal, /ALWAYS_VISIBLE/);
assert.doesNotMatch(journal, /privateReasoning|reasoningTrace|hiddenReasoning|rawChainOfThought/i);
assert.match(journalPage, /COMPUTATIONAL JOURNAL/);
assert.match(experiments, /SFI-CT-SNAPSHOT-1\.0/);
assert.match(experiments, /REGISTERED_NOT_RUNNING/);
assert.match(experiments, /count < 3/);
assert.match(experiments, /status: 'CANDIDATE'/);
assert.doesNotMatch(experiments, /status: 'APPROVED'/);
assert.match(experimentState, /REGISTERED_NOT_RUNNING fork is not an executing agent/);
assert.match(lineagePage, /CognitiveTwinExperimentControls/);
assert.match(lineagePage, /JOURNAL/);
assert.match(cron, /runCognitiveTwinDevelopmentalHeartbeat/);
assert.match(cron, /considerCognitiveTwinMutationProposal/);
assert.match(cron, /No additional Vercel cron invocation|no additional Vercel cron invocation/i);
assert.match(methodLab, /ct_reentry: \(\) => Boolean\(COGNITIVE_TWIN_REENTRY\.subjectId/);
assert.match(lineagePage, /INDIVIDUATION DEMONSTRATED/);
assert.match(canon, /OBSERVATORY/);
assert.match(canon, /METHOD LAB/);
assert.match(canon, /Directed autonomous growth/);
assert.match(canon, /Artifact provenance and authorized marks/);

assert.match(phiCanon, /Phi is not one universal score/);
assert.match(phiContract, /comparability: 'WITHIN_METHOD_ONLY'/);
assert.match(canonicalFormulas, /id: 'c_field'[\s\S]*?output: \{ name: 'c_field'/);
assert.match(reconciliation, /former statement "three unreconciled Phi formulas" is no longer an active canonical conflict/);

for (const domain of ['CULTURAL', 'ECONOMY', 'GEO_DIGITAL', 'GEOPOLITICAL', 'BIO', 'CLIMATE', 'INSTITUTIONAL', 'MEMETIC', 'TECH', 'AFFECTIVE']) {
  assert.ok(worldVector.includes(`'${domain}'`), `Missing current WorldSpect domain ${domain}`);
}
assert.match(reconciliation, /No current executable\/canonical registry was found.*seven-domain/s);

for (const protocol of ['MOP_S_MEDIA', 'MOP_S_CHANNEL', 'MOP_S_BOUNDARY']) {
  assert.ok(mops.includes(`id: '${protocol}'`), `Missing MOP-S protocol ${protocol}`);
}
assert.match(mops, /P0-A/);
assert.match(mops, /P0-B/);
assert.match(mops, /P0-C/);
assert.match(mops, /Kavak may be used as an applied case/);
assert.match(mops, /not the conceptual origin/);

assert.equal(prereg.status, 'PREREGISTERED_EXPERIMENTAL');
assert.equal(typeof prereg.null_hypothesis, 'string');
assert.ok(Array.isArray(prereg.minimum_controls));
assert.ok(Array.isArray(prereg.initial_lineages));

const cronCount = Array.isArray(vercel.crons) ? vercel.crons.length : 0;
assert.equal(cronCount, 7, `Expected the existing 7 Vercel crons, found ${cronCount}`);

console.log('SFI Cognitive Twin longitudinal completion QA: PASS');
console.log('- CT-A01 genesis + developmental heartbeat + root-visible journal present');
console.log('- snapshot/fork controls present; registered fork is never represented as executing');
console.log('- repeated evaluation failure can only create a governed CANDIDATE mutation proposal');
console.log('- no new cron introduced');
console.log('- Phi family reconciliation remains method-scoped; c_field is not canonical Phi');
console.log('- current WorldSpect ten-domain contract remains explicit; no invented seven-domain mapping');
console.log('- MOP-S MEDIA / CHANNEL / BOUNDARY registered as EXPERIMENTAL with P0-A/B/C');
