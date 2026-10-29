import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasOpenUniversalCycle, UNIVERSAL_LIFECYCLE_EVENTS } from './universalLifecycleGate';

const id = 'universal-cycle:675489e8-c72e-46a5-beb5-abd738fa0468';
const opened = { logbook_id: id, event_name: 'SFI_UNIVERSAL_CYCLE_OPENED' };
const closed = { logbook_id: id, event_name: 'SFI_UNIVERSAL_CYCLE_CLOSED' };

test('newly opened cycle is included in the scheduler query', () => {
  assert.ok(UNIVERSAL_LIFECYCLE_EVENTS.includes('SFI_UNIVERSAL_CYCLE_OPENED'));
  assert.equal(hasOpenUniversalCycle([opened]), true);
});

test('latest closure suppresses a completed cycle', () => {
  assert.equal(hasOpenUniversalCycle([closed, opened]), false);
});

test('a resumed cycle after a closure remains actionable', () => {
  assert.equal(hasOpenUniversalCycle([
    { logbook_id: id, event_name: 'SFI_UNIVERSAL_CYCLE_RESUMED' },
    closed,
    opened,
  ]), true);
});

test('an open second cycle remains actionable when another is closed', () => {
  assert.equal(hasOpenUniversalCycle([
    closed,
    { logbook_id: 'universal-cycle:9051ebcd-ea7e-460f-8a37-fc831c3e0484', event_name: 'SFI_UNIVERSAL_CYCLE_OPENED' },
    opened,
  ]), true);
});

test('events without a logbook do not represent a reconstructable cycle', () => {
  assert.equal(hasOpenUniversalCycle([
    { logbook_id: '', event_name: 'SFI_UNIVERSAL_CYCLE_OPENED' },
    { event_name: 'SFI_UNIVERSAL_COGNITIVE_CHECKPOINT' },
  ]), false);
});

test('no lifecycle events means no open cycle', () => {
  assert.equal(hasOpenUniversalCycle([]), false);
});
