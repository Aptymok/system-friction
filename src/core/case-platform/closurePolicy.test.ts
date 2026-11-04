import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateCaseInactivity } from './closurePolicy';

test('alerts after two distinct reviews and closes after three', () => {
  const review = (cycleId: string) => ({ cycleId, result: 'unchanged' as const });
  assert.equal(evaluateCaseInactivity([review('a'), review('a'), review('b')]).action, 'alert');
  assert.equal(evaluateCaseInactivity([review('a'), review('b'), review('c')]).action, 'close');
});

test('failed review cannot advance the counter and new work resets it', () => {
  const history = [{ cycleId: 'a', result: 'unchanged' as const }, { cycleId: 'b', result: 'unchanged' as const }];
  assert.deepEqual(evaluateCaseInactivity([...history, { cycleId: 'c', result: 'blocked' }]), { inactiveCycles: 2, threshold: 3, action: 'blocked' });
  assert.equal(evaluateCaseInactivity([...history, { cycleId: 'd', result: 'progress' }]).inactiveCycles, 0);
});
