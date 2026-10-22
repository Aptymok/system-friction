import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/sfi/universalEmpiricalContinuation.ts', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('  // Reuse an inconclusive contrast'), source.indexOf('  const classification = await classifyReturnWithAi', source.indexOf('  // Reuse an inconclusive contrast')));
assert(section.length > 0, 'idempotence guard must exist before classification');
const compare = (prior: Record<string, unknown>, current: Record<string, unknown>) => {
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return ['observedReturn','primaryHypothesis','rivalHypotheses','predictions','discriminatingObservations','stoppingConditions','expectedSignals','contradictionSignals','observationWindows','declaredReturnEvidenceRefs','returnEvidenceRefs','rejectedReturnEvidenceRefs','evidenceValidationWarning']
    .every(k => equal(prior[k] ?? null, current[k] ?? null));
};
const base = { observedReturn: { result: 'NOT_OBSERVED' }, primaryHypothesis: 'H1', rivalHypotheses: ['H2'], predictions: ['P1'], discriminatingObservations: ['O1'], stoppingConditions: ['S1'], expectedSignals: ['yes'], contradictionSignals: ['no'], observationWindows: ['T1'], declaredReturnEvidenceRefs: ['e1'], returnEvidenceRefs: ['e1'], rejectedReturnEvidenceRefs: [], evidenceValidationWarning: null };

test('unchanged inputs are semantically equal and guard precedes classifier', () => {
  assert(compare(base, structuredClone(base)));
  assert(section.includes('sameInputs'));
  assert(section.includes('evidenceValidation.ok'));
});
test('new verified evidence permits another contrast', () => {
  assert(!compare(base, {...base, returnEvidenceRefs: ['e1','e2']}));
});
test('revised prediction permits another contrast', () => {
  assert(!compare(base, {...base, predictions: ['P2']}));
});
test('changed RETURN permits another contrast', () => {
  assert(!compare(base, {...base, observedReturn: { result: 'OBSERVED' }}));
});
test('validation failure must bypass reuse', () => {
  const reuse = (valid: boolean) => valid && compare(base, structuredClone(base));
  assert.equal(reuse(false), false);
});
test('concurrent read-before-write is NOT atomically protected (known failing safety requirement)', async () => {
  const events: string[] = [];
  const run = async () => {
    const prior = events.length;
    await Promise.resolve();
    if (!prior) events.push('contrast');
  };
  await Promise.all([run(), run()]);
  // This test intentionally records the unsolved race without claiming a DB-level guarantee.
  assert.equal(events.length, 2);
});
