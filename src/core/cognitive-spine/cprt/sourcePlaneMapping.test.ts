import assert from 'node:assert/strict';
import test from 'node:test';

import {
  governanceEventToCognitiveSpineSource,
  labHypothesisToCognitiveSpineSource,
} from '../sourcePlane/institutionalSourceMapping';

test('append-only Lab hypothesis enters as HYPOTHESIS and verification debt, never evidence', () => {
  const record = labHypothesisToCognitiveSpineSource({
    hypothesis: {
      id: 'H-LAB-001',
      analysis_id: 'A-001',
      title: 'Cross-domain persistence hypothesis',
      status: 'persistent_signal',
      confidence: 0.71,
      payload: { statement: 'Pattern may persist across contexts.' },
      created_at: '2026-08-16T08:00:00.000Z',
    },
    analysis: {
      id: 'A-001',
      mode: 'detect_signals',
      source: 'method_lab',
      data_mode: 'real_input',
    },
  });

  assert.ok(record);
  assert.equal(record.kind, 'HYPOTHESIS');
  assert.equal(record.ref, 'sfi_hypotheses:H-LAB-001');
  assert.equal(record.debtType, 'VERIFICATION');
  assert.equal(record.epistemicClass, undefined);
  assert.deepEqual(record.ancestryRoots, ['sfi_lab_analyses:A-001']);
  assert.deepEqual(record.visibilityProfiles, ['*']);
});

test('ROOT governance transitions are reconstructed from immutable epistemic events', () => {
  const base = {
    event_id: 'EV-GOV-001',
    epistemic_class: 'derived',
    occurred_at: '2026-08-16T08:05:00.000Z',
    hash_self: 'a'.repeat(64),
    schema_version: 'EPISTEMIC-EVENT-1.0',
    lineage: ['PROPOSAL-001'],
    payload: { proposal_id: 'PROPOSAL-001' },
  };

  const approved = governanceEventToCognitiveSpineSource({ ...base, event_name: 'acp.proposal.design_approved' });
  const rejected = governanceEventToCognitiveSpineSource({ ...base, event_id: 'EV-GOV-002', hash_self: 'b'.repeat(64), event_name: 'acp.proposal.rejected' });
  const frozen = governanceEventToCognitiveSpineSource({ ...base, event_id: 'EV-GOV-003', hash_self: 'c'.repeat(64), event_name: 'acp.proposal.frozen' });
  const waiting = governanceEventToCognitiveSpineSource({ ...base, event_id: 'EV-GOV-004', hash_self: 'd'.repeat(64), event_name: 'acp.proposal.waiting_evidence' });

  assert.equal(approved?.kind, 'DECISION');
  assert.equal(rejected?.kind, 'DECISION');
  assert.equal(frozen?.kind, 'FREEZE');
  assert.equal(waiting?.kind, 'QUESTION');
  assert.equal(waiting?.debtType, 'VERIFICATION');
  assert.equal(approved?.epistemicClass, 'DERIVED');
  assert.equal(approved?.sourceHash, 'a'.repeat(64));
  assert.deepEqual(approved?.ancestryRoots, ['PROPOSAL-001']);
});

test('unrelated epistemic events do not enter governance projection by pattern guessing', () => {
  const record = governanceEventToCognitiveSpineSource({
    event_id: 'EV-OTHER',
    event_name: 'root.state.read',
    epistemic_class: 'observed',
    occurred_at: '2026-08-16T08:10:00.000Z',
    hash_self: 'e'.repeat(64),
    schema_version: 'EPISTEMIC-EVENT-1.0',
    lineage: [],
  });
  assert.equal(record, null);
});

test('missing append-only identity fields fail closed instead of fabricating a source record', () => {
  assert.equal(labHypothesisToCognitiveSpineSource({
    hypothesis: { id: 'H-001', analysis_id: 'A-001' },
    analysis: { id: 'A-001' },
  }), null);

  assert.equal(governanceEventToCognitiveSpineSource({
    event_id: 'EV-001',
    event_name: 'acp.proposal.frozen',
    occurred_at: '2026-08-16T08:10:00.000Z',
  }), null);
});
