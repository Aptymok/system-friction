import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcilePlannedEvents } from './reconcilePlan';

const plan = [
  { id: 'D01', dueAt: '2026-10-20T12:00:00-06:00', description: 'First publication', sourceRef: 'drive:plan-v1' },
  { id: 'D02', dueAt: '2026-10-21T12:00:00-06:00', description: 'Second publication', sourceRef: 'drive:plan-v1' },
  { id: 'D90', dueAt: '2027-01-17T12:00:00-06:00', description: 'Final publication', sourceRef: 'drive:plan-v1' },
];
test('unknown is not misreported as a missed post without complete source coverage', () => {
  const rows = reconcilePlannedEvents({ plan, observations: [], coverage: [], asOf: '2026-10-24T08:00:00-06:00' });
  assert.deepEqual(rows.map(r => r.state), ['UNKNOWN', 'UNKNOWN', 'NOT_DUE']);
});
test('verified publication is observed, unverified claims remain unverified', () => {
  const rows = reconcilePlannedEvents({
    plan,
    observations: [
      { id: 'ig1', plannedId: 'D01', occurredAt: '2026-10-20T19:00:00-06:00', sourceRef: 'instagram:permalink-1', verified: true },
      { id: 'draft2', plannedId: 'D02', occurredAt: '2026-10-21T19:00:00-06:00', sourceRef: 'drive:draft2', verified: false },
    ],
    coverage: [], asOf: '2026-10-24T08:00:00-06:00',
  });
  assert.deepEqual(rows.map(r => r.state), ['OBSERVED', 'UNVERIFIED', 'NOT_DUE']);
});
test('complete observation coverage permits negative finding without claiming impossibility', () => {
  const rows = reconcilePlannedEvents({
    plan, observations: [],
    coverage: [{ from: '2026-10-19T00:00:00-06:00', through: '2026-10-24T08:00:00-06:00', complete: true, sourceRef: 'instagram:account-export' }],
    asOf: '2026-10-24T08:00:00-06:00',
  });
  assert.equal(rows[0].state, 'NOT_OBSERVED_IN_COMPLETE_WINDOW');
  assert.equal(rows[0].coverageRef, 'instagram:account-export');
});
test('duplicate planned IDs are rejected', () => {
  assert.throws(() => reconcilePlannedEvents({ plan: [plan[0], plan[0]], observations: [], coverage: [], asOf: '2026-10-24T08:00:00-06:00' }), /SFI_RC_INVALID_PLAN/);
});
