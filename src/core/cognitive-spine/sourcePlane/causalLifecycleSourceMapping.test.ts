import assert from 'node:assert/strict';
import test from 'node:test';

import {
  causalLifecycleEventToCognitiveSpineSource,
  isCognitiveSpineCausalLifecycleEventName,
} from './causalLifecycleSourceMapping';

test('causal lifecycle mapper preserves observed return provenance', () => {
  const mapped = causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-RETURN-001',
    event_name: 'SFI_PROPOSAL_RETURN_RECORDED',
    epistemic_class: 'observed',
    schema_version: '2026-05-27.epistemic-events.v1',
    occurred_at: '2026-08-27T10:00:00.000Z',
    hash_self: 'a'.repeat(64),
    lineage: ['PROPOSAL-001', 'EV-EXECUTION-001'],
  });

  assert.ok(mapped);
  assert.equal(mapped.kind, 'EVENT');
  assert.equal(mapped.epistemicClass, 'OBSERVED');
  assert.equal(mapped.sourceHash, 'a'.repeat(64));
  assert.deepEqual(mapped.ancestryRoots, ['EV-EXECUTION-001', 'PROPOSAL-001']);
});

test('causal lifecycle mapper does not treat unrelated events as causal path state', () => {
  assert.equal(isCognitiveSpineCausalLifecycleEventName('random.event'), false);
  assert.equal(causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-OTHER-001',
    event_name: 'random.event',
    epistemic_class: 'observed',
    occurred_at: '2026-08-27T10:00:00.000Z',
    hash_self: 'b'.repeat(64),
    lineage: [],
  }), null);
});

test('causal lifecycle mapper keeps derived proposal state derived', () => {
  const mapped = causalLifecycleEventToCognitiveSpineSource({
    event_id: 'EV-PROPOSAL-001',
    event_name: 'cognitive_spine.runtime.proposal_created',
    epistemic_class: 'derived',
    occurred_at: '2026-08-27T10:00:00.000Z',
    hash_self: 'c'.repeat(64),
    lineage: ['RUN-001'],
  });

  assert.ok(mapped);
  assert.equal(mapped.epistemicClass, 'DERIVED');
});
