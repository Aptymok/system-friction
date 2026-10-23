import test from 'node:test';
import assert from 'node:assert/strict';
import {
  returnContrastInputFingerprint,
  reusableReturnContrast,
  SFI_RETURN_CONTRAST_IDEMPOTENCY,
  type ReturnContrastInputs,
} from './universalReturnContrastIdempotency';

function inputs(): ReturnContrastInputs {
  return {
    returnEventId: 'return-sfi-synthetic-001',
    primaryHypothesis: { statement: 'The observed system may lack fresh evidence', confidence: 0.4 },
    rivalHypotheses: [{ statement: 'Agent queue could be idle', confidence: 0.3 }],
    predictions: [{ statement: 'A new authorized task triggers a run', expectedSignals: ['AGENT_RECEIPT'], contradictionSignals: ['DENIED_RECEIPT'] }],
    discriminatingObservations: ['Read the bounded execution receipt'],
    stoppingConditions: ['Stop when authority is missing'],
    expectedSignals: ['AGENT_RECEIPT'],
    contradictionSignals: ['DENIED_RECEIPT'],
    observationWindows: ['T+1h'],
    observedReturn: { kind: 'SIMULATED', detail: 'No empirical return' },
    declaredReturnEvidenceRefs: ['synthetic-source-event'],
    returnEvidenceRefs: [],
    rejectedReturnEvidenceRefs: ['synthetic-source-event'],
    evidenceValidationWarning: null,
    evidenceValidationSucceeded: true,
    returnTraceability: 'DECLARED_BUT_UNVERIFIED',
  };
}

function storedLegacy(input: ReturnContrastInputs) {
  const { returnEventId: _ignored, evidenceValidationSucceeded: _status, ...body } = input;
  return {
    event_name: 'SFI_UNIVERSAL_RETURN_CONTRASTED',
    lineage: [input.returnEventId],
    payload: { contract:'SFI-RETURN-CONTRAST-1.2', ...body,
      calibrationStatus:'REQUIRES_REVIEW',classification:'INCONCLUSIVE' },
  };
}

test('unchanged legacy INCONCLUSIVE contrast reuses the same exact source and skips a second AI call', () => {
  const i=inputs();
  assert.equal(reusableReturnContrast(storedLegacy(i),i),true);
});
test('new version-bound fingerprint matches unchanged inputs and is stable to object property order',()=>{
  const i=inputs(),f=returnContrastInputFingerprint(i);
  assert.match(f,/^[0-9a-f]{64}$/);
  const event={...storedLegacy(i),payload:{contrastInputFingerprint:f,contrastInputContract:SFI_RETURN_CONTRAST_IDEMPOTENCY}};
  assert.equal(reusableReturnContrast(event,i),true);
  const reordered={...i,observedReturn:{ detail:'No empirical return',kind:'SIMULATED' }};
  assert.equal(returnContrastInputFingerprint(reordered),f);
});
test('a new prediction or discriminating observation requires fresh contrast',()=>{
  const i=inputs(),prior=storedLegacy(i);
  assert.equal(reusableReturnContrast(prior,{...i,predictions:[...i.predictions,{statement:'New registered expectation'}]}),false);
  assert.equal(reusableReturnContrast(prior,{...i,discriminatingObservations:['A genuinely new input']}),false);
  assert.equal(reusableReturnContrast(prior,{...i,stoppingConditions:['A different stop condition']}),false);
});
test('new verified evidence, a changed rejection and a new evidence warning require reevaluation',()=>{
  const i=inputs(),prior=storedLegacy(i);
  assert.equal(reusableReturnContrast(prior,{...i,returnEvidenceRefs:['synthetic-source-event'],rejectedReturnEvidenceRefs:[],returnTraceability:'VERIFIED_EVIDENCE_LINKED'}),false);
  assert.equal(reusableReturnContrast(prior,{...i,evidenceValidationWarning:'Read unavailable',evidenceValidationSucceeded:false}),false);
  assert.equal(reusableReturnContrast(prior,{...i,declaredReturnEvidenceRefs:['different-ref']}),false);
});
test('a different immutable RETURN or changed observed outcome is never suppressed',()=>{
  const i=inputs(),prior=storedLegacy(i);
  assert.equal(reusableReturnContrast(prior,{...i,returnEventId:'another-return'}),false);
  assert.equal(reusableReturnContrast(prior,{...i,observedReturn:{kind:'SIMULATED',detail:'Different observation'}}),false);
});
test('unrelated and incomplete histories are never treated as proof of an unchanged return',()=>{
  const i=inputs(),prior=storedLegacy(i);
  assert.equal(reusableReturnContrast(null,i),false);
  assert.equal(reusableReturnContrast({...prior,event_name:'SFI_UNIVERSAL_RETURN_RECORDED'},i),false);
  assert.equal(reusableReturnContrast({...prior,lineage:['another-return']},i),false);
  assert.equal(reusableReturnContrast({...prior,payload:{...prior.payload,contract:'SFI-RETURN-CONTRAST-1.1'}},i),false);
  const partial: Record<string, unknown> = {...prior.payload}; delete partial.discriminatingObservations;
  assert.equal(reusableReturnContrast({...prior,payload:partial},i),false);
});
test('a real evidence-query degradation cannot masquerade as legacy source equivalence',()=>{
  const i=inputs(),prior=storedLegacy(i);
  assert.equal(reusableReturnContrast(prior,{...i,evidenceValidationSucceeded:false}),false);
});
test('the stable hash is bound to the evidence-validation outcome, not only its text warning',()=>{
  const i=inputs();
  assert.notEqual(returnContrastInputFingerprint(i),
    returnContrastInputFingerprint({...i,evidenceValidationSucceeded:false}));
});
test('evidence SQL ordering changes do not produce a second classification',()=>{
  const a=inputs();
  const variants={...a,
    declaredReturnEvidenceRefs:['a','b'],
    returnEvidenceRefs:['b','a'],
    rejectedReturnEvidenceRefs:['c','d'],
  };
  const reordered={...variants,
    declaredReturnEvidenceRefs:['b','a'],
    returnEvidenceRefs:['a','b'],
    rejectedReturnEvidenceRefs:['d','c'],
  };
  assert.equal(returnContrastInputFingerprint(variants),returnContrastInputFingerprint(reordered));
  assert.equal(reusableReturnContrast(storedLegacy(variants),reordered),true);
});
test('empty immutable RETURN is rejected as invalid fingerprint input',()=>{
  assert.throws(()=>returnContrastInputFingerprint({...inputs(),returnEventId:''}),/RETURN_EVENT_ID_REQUIRED/);
});
