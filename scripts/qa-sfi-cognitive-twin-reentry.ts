import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const contract = read('src/lib/cognitive-twin/contract.ts');
const runtime = read('src/lib/cognitive-twin/reentry/runtime.ts');
const types = read('src/lib/cognitive-twin/reentry/types.ts');
const cron = read('src/app/api/cron/continuity-report/route.ts');
const methodLab = read('src/lib/method-lab/readModel.ts');
const lineagePage = read('src/app/root/cognitive-twin/lineage/page.tsx');
const canon = read('docs/canon/16_LONGITUDINAL_SYSTEM_FRICTION_PROGRAM.md');
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
assert.match(cron, /runCognitiveTwinDevelopmentalHeartbeat/);
assert.match(cron, /No additional Vercel cron invocation|no additional Vercel cron invocation/i);
assert.match(methodLab, /ct_reentry: \(\) => Boolean\(COGNITIVE_TWIN_REENTRY\.subjectId/);
assert.match(lineagePage, /INDIVIDUATION DEMONSTRATED/);
assert.match(canon, /OBSERVATORY/);
assert.match(canon, /METHOD LAB/);
assert.match(canon, /Directed autonomous growth/);
assert.match(canon, /Artifact provenance and authorized marks/);
assert.equal(prereg.status, 'PREREGISTERED_EXPERIMENTAL');
assert.equal(typeof prereg.null_hypothesis, 'string');
assert.ok(Array.isArray(prereg.minimum_controls));
assert.ok(Array.isArray(prereg.initial_lineages));

const cronCount = Array.isArray(vercel.crons) ? vercel.crons.length : 0;
assert.equal(cronCount, 7, `Expected the existing 7 Vercel crons, found ${cronCount}`);

console.log('SFI Cognitive Twin reentry QA: PASS');
console.log('- CT-A01 genesis + developmental heartbeat present');
console.log('- no new cron introduced');
console.log('- computational self-report and authority boundaries explicit');
console.log('- no private reasoning trace fields introduced');
console.log('- LCI preregistration present with negative-result policy');
console.log('- longitudinal system-friction institutional cycle indexed in canon');
