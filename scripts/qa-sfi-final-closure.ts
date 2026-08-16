import assert from 'node:assert/strict';
import { FINAL_CLOSURE_GATES, ARCHITECTURE_FREEZE } from '../src/lib/institutional/finalClosure';
import { CT_ANCESTRAL_CAPABILITIES } from '../src/core/cognitive-twin/reentry/ancestralCapabilities';
import { SPECIALIZED_MODELS } from '../src/lib/method-lab/specializedModels';
import { createStudioFieldHandoff, verifyStudioFieldHandoff } from '../src/lib/studio/fieldHandoff';
import { finalizeReturnContrast, canMarkLongitudinalCaseComplete } from '../src/lib/field/returnContrastContract';
import { observatoryPublicationDisposition } from '../src/lib/observatory/publicationGate';
import { APEX_SOCIOTECHNICAL_PILOT } from '../src/lib/method-lab/apexPilot';
import { CRL_PERSISTENCE_POLICY } from '../src/lib/cognitive-lab/persistencePolicy';

assert.equal(ARCHITECTURE_FREEZE.active, true);
for (const id of ['CRL_PERSISTENCE','CT_ANCESTRAL_REENTRY','SIMULATION_SPECIALIZATION','STUDIO_FIELD_HANDOFF','MANDATORY_RETURN_CONTRAST','OBSERVATORY_PUBLICATION_GATE','TOTAL_PROOF_REALITY','EXTERNAL_TIME_AND_REPLICATION']) {
  assert.ok(FINAL_CLOSURE_GATES.some((gate)=>gate.id===id), `missing_closure_gate:${id}`);
}

assert.equal(CRL_PERSISTENCE_POLICY.design, 'HYBRID_GOVERNED_MIGRATION');
assert.equal(CRL_PERSISTENCE_POLICY.institutionalRunLedger, 'sfi_lab_analyses');
assert.equal(CRL_PERSISTENCE_POLICY.codeDesignResolved, true);
assert.equal(CRL_PERSISTENCE_POLICY.productionSchemaVerified, false);

assert.equal(CT_ANCESTRAL_CAPABILITIES.length, 7);
for (const capability of CT_ANCESTRAL_CAPABILITIES) {
  assert.equal(capability.status, 'EXPERIMENTAL_REENTRY');
  assert.equal(capability.methodLabRequired, true);
  assert.equal(capability.rollbackRequired, true);
  assert.equal(capability.authorityDelta, 0);
  assert.equal(capability.privateReasoningPersisted, false);
}

assert.deepEqual(SPECIALIZED_MODELS.map((model)=>model.id).sort(), ['OBSERVABLE_ECONOMIC_STATE_MODEL','SOCIOTECHNICAL_STATE_MODEL']);
for (const model of SPECIALIZED_MODELS) {
  assert.equal(model.epistemicClass, 'SIMULATED');
  assert.ok(model.returnContract.includes('observed_signals') || model.returnContract.includes('observed_outcomes'));
}

const handoff = createStudioFieldHandoff({
  sourceObjectId:'qa-object', interventionId:'qa-intervention', predictionSeal:'sha256:qa', returnWindow:'72h', evidenceRefs:['evidence:1'], createdAt:'2026-08-11T00:00:00.000Z', handoffId:'SFI-HANDOFF-QA',
});
assert.equal(verifyStudioFieldHandoff(handoff), true);
assert.equal(verifyStudioFieldHandoff({...handoff, interventionId:'tampered'}), false);

const contrast = finalizeReturnContrast({ predictionSeal:'sha256:qa', expected:0.7, observed:0.4, rivalInterpretation:'Null-compatible rival', stoppingCondition:'One declared return window completed', evidenceRefs:['evidence:return'] });
assert.equal(contrast.complete, true);
assert.equal(canMarkLongitudinalCaseComplete(contrast), true);
assert.equal(canMarkLongitudinalCaseComplete({...contrast, rivalInterpretation:''}), false);

assert.equal(observatoryPublicationDisposition({ epistemicClass:'SIMULATED', authority:'PUBLIC', sourceRefs:['x'] }).disposition, 'BLOCK');
assert.equal(observatoryPublicationDisposition({ epistemicClass:'OBSERVED', authority:'PUBLIC', sourceRefs:['x'] }).disposition, 'PUBLISH');
assert.equal(observatoryPublicationDisposition({ epistemicClass:'INFERRED', authority:'ROOT_AUTHORIZED_PROJECTION', sourceRefs:['x'] }).disposition, 'PUBLISH_AS_PROJECTION');

assert.equal(APEX_SOCIOTECHNICAL_PILOT.institutionalHome, 'SFI Method Lab');
assert.equal(APEX_SOCIOTECHNICAL_PILOT.parentProtocolId, 'sociotechnical_simulation');
assert.equal(APEX_SOCIOTECHNICAL_PILOT.notASeparateLab, true);
assert.equal(APEX_SOCIOTECHNICAL_PILOT.authorityBoundary.automaticExternalExecution, false);
assert.equal(APEX_SOCIOTECHNICAL_PILOT.authorityBoundary.apexHumanApprovalRequiredForOperationalChange, true);
assert.ok(APEX_SOCIOTECHNICAL_PILOT.cycle.includes('RETURN_CONTRAST'));
assert.ok(APEX_SOCIOTECHNICAL_PILOT.cycle.includes('ATLAS_CASE_RECORD'));

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-FINAL-CLOSURE-1.0',
  closureGates:FINAL_CLOSURE_GATES.length,
  ancestralCapabilities:CT_ANCESTRAL_CAPABILITIES.length,
  specializedModels:SPECIALIZED_MODELS.map((model)=>model.id),
  apexPilot:APEX_SOCIOTECHNICAL_PILOT.name,
}, null, 2));
