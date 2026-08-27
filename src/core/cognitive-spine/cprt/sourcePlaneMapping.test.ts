import assert from 'node:assert/strict';
import test from 'node:test';

import {
  causalLifecycleEventToCognitiveSpineSource,
  isCognitiveSpineCausalLifecycleEventName,
} from '../sourcePlane/causalLifecycleSourceMapping';
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

test('governed causal lifecycle events enter as EVENT records without epistemic promotion', () => {
  const observedReturn = causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-RETURN-001',
    event_name: 'SFI_PROPOSAL_RETURN_RECORDED',
    epistemic_class: 'observed',
    schema_version: '2026-05-27.epistemic-events.v1',
    occurred_at: '2026-08-27T10:00:00.000Z',
    hash_self: 'f'.repeat(64),
    lineage: ['PROPOSAL-001', 'EV-EXECUTION-001'],
  });
  const derivedOutcome = causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-OUTCOME-001',
    event_name: 'acp.proposal.outcome_recorded',
    epistemic_class: 'derived',
    occurred_at: '2026-08-27T10:01:00.000Z',
    hash_self: 'g'.repeat(64),
    lineage: ['PROPOSAL-001', 'EV-RETURN-001'],
  });

  assert.ok(observedReturn);
  assert.equal(observedReturn.kind, 'EVENT');
  assert.equal(observedReturn.epistemicClass, 'OBSERVED');
  assert.equal(observedReturn.sourceHash, 'f'.repeat(64));
  assert.deepEqual(observedReturn.ancestryRoots, ['EV-EXECUTION-001', 'PROPOSAL-001']);
  assert.ok(derivedOutcome);
  assert.equal(derivedOutcome.kind, 'EVENT');
  assert.equal(derivedOutcome.epistemicClass, 'DERIVED');
});

test('unrelated epistemic events do not enter governance or causal lifecycle projection by pattern guessing', () => {
  const governanceRecord = governanceEventToCognitiveSpineSource({
    event_id: 'EV-OTHER',
    event_name: 'root.state.read',
    epistemic_class: 'observed',
    occurred_at: '2026-08-16T08:10:00.000Z',
    hash_self: 'e'.repeat(64),
    schema_version: 'EPISTEMIC-EVENT-1.0',
    lineage: [],
  });
  const causalRecord = causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-OTHER-CAUSAL',
    event_name: 'random.event',
    epistemic_class: 'observed',
    occurred_at: '2026-08-16T08:10:00.000Z',
    hash_self: 'h'.repeat(64),
    schema_version: 'EPISTEMIC-EVENT-1.0',
    lineage: [],
  });

  assert.equal(governanceRecord, null);
  assert.equal(isCognitiveSpineCausalLifecycleEventName('random.event'), false);
  assert.equal(causalRecord, null);
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

  assert.equal(causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-CAUSAL-001',
    event_name: 'SFI_PROPOSAL_RETURN_RECORDED',
    occurred_at: '2026-08-16T08:10:00.000Z',
  }), null);
});
