import assert from 'node:assert/strict';
import test from 'node:test';
import { METHOD_LAB_EXPERIMENT_CONTRACT_VERSION, type MethodLabExperimentPreregistration } from './experimentContract';
import { buildMethodLabPreregistrationExport, METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION } from './preregistrationExport';

const preregistration: MethodLabExperimentPreregistration = {
  contractVersion: METHOD_LAB_EXPERIMENT_CONTRACT_VERSION,
  experimentId: 'EXP-EXPORT-001',
  experimentType: 'REENTRY',
  METHOD: { methodId: 'method-lab-ui:reentry', version: 'SFI-METHOD-LAB-UI-1.0', description: 'Frozen reentry comparison.' },
  HYPOTHESIS: { statement: 'A bounded configuration change alters the declared signal.', nullStatement: 'No declared signal changes.' },
  T0: { cutoff: '2026-09-08T12:00:00.000Z', timezone: 'America/Mexico_City', frozenInputRefs: ['case:1','evidence:1','twin:private-ref'] },
  POPULATION_SYSTEM: { kind: 'SYSTEM', ref: 'case:1', description: 'Owner-scoped case.' },
  INPUTS: [
    { ref: 'case:1', role: 'CONTEXT', epistemicClass: 'DECLARED' },
    { ref: 'context:missing', role: 'CONTEXT', epistemicClass: 'MISSING' },
    { ref: 'evidence:1', role: 'EVIDENCE', epistemicClass: 'OBSERVED' },
    { ref: 'evidence:simulated', role: 'EVIDENCE', epistemicClass: 'SIMULATED' },
    { ref: 'model:gpt', role: 'MODEL', epistemicClass: 'DECLARED' },
    { ref: 'passport:bounded', role: 'PASSPORT', epistemicClass: 'DECLARED' },
    { ref: 'twin:private-ref', role: 'TWIN_STATE', epistemicClass: 'DERIVED' },
  ],
  CONTROL: { kind: 'CONTROL', description: 'Frozen T0 control.', inputRefs: ['case:1','evidence:1','twin:private-ref'] },
  VARIANTS: [{ variantId: 'variant-1', description: 'Change one configuration axis.', changes: { model: 'alternate' } }],
  EXPECTED_SIGNAL: { description: 'Declared divergence.', measures: ['delta_decision'] },
  FALSIFICATION: { condition: 'No divergence under the preregistered comparison.', requiredEvidence: ['evidence:1'] },
  STOPPING_RULE: { condition: 'Stop after one comparison.', maxExecutions: 1 },
  RETURN_WINDOW: { opensAt: '2026-09-08T12:00:00.000Z', closesAt: '2026-10-08T12:00:00.000Z', required: true },
  preregisteredAt: '2026-09-08T11:59:00.000Z',
  preregisteredBy: 'owner-private-id',
  canonicalMutation: false,
};

const definitionHash = 'a'.repeat(64);

test('preregistration export is deterministic, registration-neutral, payload-private, and reproducibility-complete', () => {
  const first = buildMethodLabPreregistrationExport({ preregistration, definitionHash });
  const second = buildMethodLabPreregistrationExport({ preregistration: structuredClone(preregistration), definitionHash });
  assert.equal(first.contractVersion, METHOD_LAB_PREREGISTRATION_EXPORT_CONTRACT_VERSION);
  assert.deepEqual(first, second);
  assert.match(first.exportHash, /^[a-f0-9]{64}$/);
  assert.equal(first.exportId, `method-lab:prereg-export:${preregistration.experimentId}:${definitionHash}`);

  assert.deepEqual(first.POPULATION_SYSTEM, preregistration.POPULATION_SYSTEM);
  assert.deepEqual(first.CONTROL, preregistration.CONTROL);
  assert.deepEqual(first.VARIANTS, preregistration.VARIANTS);
  assert.deepEqual(first.VARIANTS[0].changes, { model: 'alternate' });

  assert.deepEqual(first.REPRODUCIBILITY_REFS.evidenceRefs, [
    { ref: 'evidence:1', epistemicClass: 'OBSERVED' },
    { ref: 'evidence:simulated', epistemicClass: 'SIMULATED' },
  ]);
  assert.deepEqual(first.REPRODUCIBILITY_REFS.modelRefs, [{ ref: 'model:gpt', epistemicClass: 'DECLARED' }]);
  assert.deepEqual(first.REPRODUCIBILITY_REFS.passportRefs, [{ ref: 'passport:bounded', epistemicClass: 'DECLARED' }]);
  assert.deepEqual(first.REPRODUCIBILITY_REFS.twinStateRefs, [{ ref: 'twin:private-ref', epistemicClass: 'DERIVED' }]);
  assert.deepEqual(first.REPRODUCIBILITY_REFS.contextRefs, [
    { ref: 'case:1', epistemicClass: 'DECLARED' },
    { ref: 'context:missing', epistemicClass: 'MISSING' },
  ]);
  assert.ok(first.REPRODUCIBILITY_REFS.inputs.some((item) => item.ref === 'evidence:simulated' && item.role === 'EVIDENCE' && item.epistemicClass === 'SIMULATED'));
  assert.ok(first.REPRODUCIBILITY_REFS.inputs.some((item) => item.ref === 'context:missing' && item.role === 'CONTEXT' && item.epistemicClass === 'MISSING'));
  assert.equal(first.boundaries.epistemicClassesPreserved, true);
  assert.equal(first.boundaries.frozenArmsPreserved, true);
  assert.equal(first.boundaries.externalRegistrationClaim, false);
  assert.equal(first.boundaries.registrationState, 'NOT_REGISTERED_EXTERNALLY');
  assert.equal(first.boundaries.privateTwinPayloadIncluded, false);
  assert.equal(first.boundaries.canonicalMutation, false);
  assert.equal(JSON.stringify(first).includes('owner-private-id'), false);
});

test('preregistration export rejects unbound definition hashes', () => {
  assert.throws(() => buildMethodLabPreregistrationExport({ preregistration, definitionHash: 'not-a-sha256' }), /DEFINITION_HASH_INVALID/);
});
