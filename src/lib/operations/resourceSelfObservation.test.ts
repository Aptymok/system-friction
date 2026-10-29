import assert from 'node:assert/strict';
import test from 'node:test';
import { assessSfiResourcePosture } from './resourceSelfObservation';

test('unavailable meter does not grant C07 admission or invent zero cost', () => {
  const value = assessSfiResourcePosture({ meter: { ok: false }, registeredCognitiveAgents: 21, cognitiveExecutionCount24h: 0 });
  assert.equal(value.c07.state, 'UNKNOWN');
  assert.equal(value.c07.admissionAllowed, false);
  assert.equal(value.provider.reportedComponentUsd, null);
  assert.ok(value.warnings.includes('COGNITIVE_EXECUTION_GAP_24H'));
  assert.equal(value.plan[0].decision, 'CONTINUE_WITH_EXISTING_SOURCE_LIMITS');
});

test('C07 quota exhaustion is scoped, not a world observation outage', () => {
  const value = assessSfiResourcePosture({ meter: {
    ok: true, quota: { ok: true, remainingToday: 0, remainingMonth: 21, admissionAllowed: false, scheduledExecutionAllowed: false },
    providerSpending: { status: 'INCOMPLETE', observedUsd: null },
  } });
  assert.equal(value.c07.state, 'LIMITED');
  assert.equal(value.plan[1].decision, 'DEFER_NEW_C07_ADMISSIONS');
  assert.equal(value.plan[0].decision, 'CONTINUE_WITH_EXISTING_SOURCE_LIMITS');
  assert.equal(value.vendorBilling, 'NOT_VERIFIED');
});

test('scoped provider ledger does not certify vendor billing', () => {
  const value = assessSfiResourcePosture({ meter: {
    ok: true, quota: { ok: true, remainingToday: 3, remainingMonth: 40, admissionAllowed: true, scheduledExecutionAllowed: true },
    providerSpending: { status: 'PROVIDER_REPORTED_COMPONENTS', observedUsd: 0 },
  }, registeredCognitiveAgents: 21, cognitiveExecutionCount24h: 2 });
  assert.equal(value.c07.state, 'WITHIN_QUOTA');
  assert.equal(value.provider.reportedComponentUsd, 0);
  assert.equal(value.vendorBilling, 'NOT_VERIFIED');
  assert.equal(value.cognitiveExecution.state, 'RECENT_EXECUTION_PRESENT');
});

test('missing numeric quota never masquerades as available', () => {
  const value = assessSfiResourcePosture({ meter: {
    ok: true, quota: { ok: true, admissionAllowed: true, scheduledExecutionAllowed: true },
    providerSpending: { status: 'PROVIDER_REPORTED_COMPONENTS', observedUsd: null },
  } });
  assert.equal(value.c07.state, 'UNKNOWN');
  assert.equal(value.c07.admissionAllowed, false);
  assert.equal(value.provider.reportedComponentUsd, null);
});
