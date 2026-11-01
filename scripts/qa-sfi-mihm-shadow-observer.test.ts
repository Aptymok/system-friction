// Pure capture QA; no Supabase access, network, production calls or external effects.
// Run in repository: npx tsx --test scripts/qa-sfi-mihm-shadow-observer.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureShadowBatch, captureShadowResult } from '../src/lib/continuity/shadowObserver';

test('capture A reports candidates rather than asserting eligibility', () => {
  const captures: unknown[] = [];
  const rows = [{ id: 'p1', risk_level: 'low', secret: 'never expose' }, { id: 'p2' }];
  captureShadowBatch({ onBatch: c => { captures.push(c); } }, rows, [rows[0]]);
  assert.equal(captures.length, 1);
  const c = captures[0] as Record<string, unknown>;
  assert.equal(c.eligibilityKnown, false);
  assert.deepEqual(c.candidateIds, ['p1','p2']);
  assert.deepEqual(c.processingWindowIds, ['p1']);
  assert.equal(JSON.stringify(c).includes('never expose'), false);
});
test('captures are immutable and observer cannot mutate controller rows', () => {
  const rows = [{ id: 'p1', risk_level: 'low' }];
  captureShadowBatch({ onBatch: c => {
    try { (c.processingWindowIds as string[])[0] = 'tampered'; } catch {}
  } }, rows, rows);
  assert.equal(rows[0].id, 'p1');
});
test('observer failures are contained', () => {
  const fail = { onBatch: () => { throw Error('observer'); }, onResult: () => { throw Error('observer'); } };
  assert.doesNotThrow(() => captureShadowBatch(fail, [{id:'p1'}], [{id:'p1'}]));
  assert.doesNotThrow(() => captureShadowResult(fail, {id:'p1'}, 0, {stage:'dispatched',ok:true}));
});
test('capture B does not mislabel outcomes as gate-certified admission', () => {
  const seen: unknown[] = [];
  captureShadowResult({ onResult: x => { seen.push(x); } }, {id:'p1',owner_id:'private'}, 0, {stage:'dispatched',ok:true});
  const c=seen[0] as Record<string,unknown>;
  assert.equal(c.admitted,'NOT_CERTIFIED');
  assert.equal(c.proposalId,'p1');
  assert.equal(JSON.stringify(c).includes('private'),false);
});
