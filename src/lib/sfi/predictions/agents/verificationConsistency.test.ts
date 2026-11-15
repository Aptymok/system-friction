import test from 'node:test';
import assert from 'node:assert/strict';
import { runEvidenceStateAgent } from './evidenceStateAgent';
import { runVerificationAgent } from './verificationAgent';
import { closedVerificationOutcome } from './closedVerificationOutcome';

const entry = {
  hypothesis_id: 'H-TEST',
  prediction_registered_at: '2026-01-01T00:00:00Z',
  perturbation_applied_at: '2026-02-01T00:00:00Z',
  evidence_state: 'OBSERVED',
  is_predictive_evidence: true,
} as never;

const v = (window: string, result: string, state = 'CLOSED') =>
  ({ return_window: window, evaluation_result: result, verification_state: state }) as never;

test('single formal TRUE and FALSE results remain eligible', () => {
  for (const [value, expected] of [['TRUE', true], ['FALSE', false]] as const) {
    const data = [v('72h', value)];
    const e = runEvidenceStateAgent(entry, data);
    const p = runVerificationAgent(entry, data);
    assert.equal(e.prediction_matched, expected);
    assert.equal(e.prediction_failed, !expected);
    assert.equal(p.pfi_contribution, value);
    assert.equal(p.pfi_eligible, true);
  }
});

test('opposite closed windows are never selected by row order', () => {
  const first = [v('72h', 'TRUE'), v('30d', 'FALSE')];
  for (const data of [first, [...first].reverse()]) {
    const e = runEvidenceStateAgent(entry, data);
    const p = runVerificationAgent(entry, data);
    assert.equal(e.prediction_matched, null);
    assert.equal(e.prediction_failed, null);
    assert.equal(p.pfi_eligible, false);
    assert.equal(p.pfi_contribution, null);
    assert.ok(e.warnings.includes('conflicting_closed_verifications_across_windows'));
    assert.ok(p.warnings.includes('conflicting_closed_verifications_across_windows'));
    assert.equal(p.verifications.length, 2);
  }
});

test('disputed window blocks aggregate truth without discarding closed evidence', () => {
  const data = [v('72h', 'TRUE'), v('30d', 'NOT_EVALUATED', 'DISPUTED')];
  assert.equal(runEvidenceStateAgent(entry, data).prediction_matched, null);
  const p = runVerificationAgent(entry, data);
  assert.equal(p.pfi_eligible, false);
  assert.equal(p.disputed_count, 1);
  assert.equal(p.closed_count, 1);
});

test('superseded outcomes do not contribute to the active verdict', () => {
  const data = [v('72h', 'FALSE', 'SUPERSEDED'), v('72h', 'TRUE')];
  assert.equal(closedVerificationOutcome(data).verdict, 'TRUE');
  assert.equal(runEvidenceStateAgent(entry, data).prediction_matched, true);
  assert.equal(runVerificationAgent(entry, data).pfi_contribution, 'TRUE');
});

test('legacy narrative alone never counts as verified truth', () => {
  const oldEntry = { ...(entry as object), fallo_hipotesis: 'falló' } as never;
  const e = runEvidenceStateAgent(oldEntry, []);
  const p = runVerificationAgent(oldEntry, []);
  assert.equal(e.prediction_failed, null);
  assert.equal(p.pfi_eligible, false);
  assert.ok(e.warnings.includes('legacy_fallo_hipotesis_present_requires_formal_verification'));
  assert.equal(p.legacy_fallo_hipotesis_present_unformalized, true);
});
