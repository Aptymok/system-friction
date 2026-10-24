import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Source-contract regression for server-only cycle persistence. This does not
// execute the database, create a checkpoint or prove concurrent-worker safety.
const source = readFileSync('src/lib/sfi/cognitive-runtime/cognitiveCycle.ts', 'utf8');
const section = (start: string, end: string) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, start);
  return source.slice(from, to);
};
const resume = section('async function readLatestUnfinalizedCheckpoint', 'function returnPlan');
assert.match(resume, /if \(latest\.error\) throw new Error\('SFI_COGNITIVE_CHECKPOINT_READ_FAILED:'/);
assert.match(resume, /if \(finalized\.error\) throw new Error\('SFI_COGNITIVE_FINALIZATION_READ_FAILED:'/);
assert.doesNotMatch(resume, /if \(latest\.error \|\| !latest\.data\) return null/);
const append = section('async function persistCheckpoint', 'async function persistReturnPlan');
assert.match(append, /const result = await appendEpistemicEvent\(cognitiveCheckpointEventInput\(input\)\)/);
assert.match(append, /SFI_COGNITIVE_CHECKPOINT_WRITE_FAILED/);
assert.match(append, /return result\.data\.event_id/);
const plan = section('async function persistReturnPlan', 'export async function executeCognitiveCycle');
assert.match(plan, /SFI_RETURN_PLAN_READ_FAILED/);
assert.match(plan, /SFI_RETURN_PLAN_WRITE_FAILED/);
assert.match(plan, /const recordedReturnPlan = await appendEpistemicEvent/);
assert.match(source, /const checkpoint = await readLatestUnfinalizedCheckpoint\(context\)/);
assert.match(source, /await persistCheckpoint\(/);
console.log(JSON.stringify({
  pass: 'C07_COGNITIVE_CHECKPOINT_FAIL_CLOSED_WIRING',
  validationKind: 'STATIC_SOURCE_CONTRACT',
  checked: ['checkpoint_read_error', 'finalization_read_error', 'checkpoint_write_ack', 'return_plan_read_write_ack'],
  liveCheckpointSaved: false,
  workerConcurrencyTested: false,
  autonomousMissionRun: false,
}));
