import test from 'node:test';
import assert from 'node:assert/strict';
import { MIHM_DIMENSIONAL_TRANSFER_MODEL_V0 } from '../../core/contracts/system';
import {
  MIHM_TEMPORAL_VECTOR_PILOT,
  evaluateSyntheticTemporalVector,
  scoreSyntheticOutcome,
  type MihmTemporalVectorPilotInput,
} from './experimentalTemporalVectorPilot';

const caseFixture = (): MihmTemporalVectorPilotInput => ({
  contract: MIHM_TEMPORAL_VECTOR_PILOT,
  caseId:'LAB-SYN-MIHMT-CLOCK-001',
  dataClass:'SYNTHETIC_ONLY',
  cutoffAt:'2026-10-07T12:00:00Z',
  horizonHours:12,
  predeclaredEquivalenceDelta:0.01, // laboratory example; not a canonical tolerance
  transfer:{
    contract:MIHM_DIMENSIONAL_TRANSFER_MODEL_V0,
    status:'EXPERIMENTAL',
    sourceDimensionRef:{id:'lab:source',version:'0.1'},
    targetDimensionRef:{id:'lab:target',version:'0.1'},
    sourceObservable:'simulated_source_exposure',
    targetObservable:'simulated_target_risk',
    magnitude:0.8,
    direction:'SOURCE_TO_TARGET',
    lag:6,
    lagUnit:'hours',
    gain:0.75,
    attenuation:0.1,
    constraintRefs:[],contextRefs:[],uncertainty:null,
    epistemicClass:'SIMULATION',evidenceRefs:[],
    conservationAssumed:false,
  },
  readings:[
    {id:'LAB-SYN-SRC-001',dimensionId:'lab:source',value:0.9,occurredAt:'2026-10-06T10:00:00Z',knownAt:'2026-10-06T10:01:00Z',epistemicClass:'SIMULATED'},
    {id:'LAB-SYN-TGT-001',dimensionId:'lab:target',value:0.2,occurredAt:'2026-10-06T11:00:00Z',knownAt:'2026-10-06T11:01:00Z',epistemicClass:'SIMULATED'},
  ],
  latent:{
    id:'LAB-SYN-LAT-001',sourceDimensionId:'lab:source',targetDimensionId:'lab:target',
    knownAt:'2026-10-06T12:00:00Z',strength:0.8,epistemicClass:'SIMULATED',
    mechanism:'Declared fictional latency-dependent amplification; not evidence of physical causation.',
  },
  intervention:{
    id:'LAB-SYN-INT-001',proposedAt:'2026-10-07T11:00:00Z',
    intensity:1,status:'PROPOSED_IN_SIMULATION',
  },
});
const clone = () => structuredClone(caseFixture());

test('full synthetic vector case preserves distinct model arms without canonical Phi or evidence',()=>{
  const v=evaluateSyntheticTemporalVector(caseFixture());
  assert.equal(v.status,'READY');
  assert.equal(v.predictedAggravationRisk.noInteractionAblation,0.2);
  assert.equal(v.predictedAggravationRisk.fullVectorClockCandidate,0.5888);
  assert.equal(v.predictedAggravationRisk.noLatentHistoryAblation,0.2);
  assert.equal(v.predictedAggravationRisk.noClockAblation,0.5888);
  assert.deepEqual(v.effects.candidateMinimumRequired,['target','source','latent_dependency']);
  assert.equal(v.effects.isGloballyMinimum,false);
  assert.equal(v.prospective,false);
  assert.equal(v.canonicalPhi,false);
  assert.equal(v.realityChainEligible,false);
  assert.deepEqual(v.evidenceRefs,[]);
});
test('lag beyond horizon disables coupling; clock ablation produces a discriminating difference',()=>{
  const f=clone();f.horizonHours=4;
  const v=evaluateSyntheticTemporalVector(f);
  assert.equal(v.status,'READY');
  assert.equal(v.effects.withinHorizon,false);
  assert.equal(v.predictedAggravationRisk.fullVectorClockCandidate,0.2);
  assert.equal(v.predictedAggravationRisk.noClockAblation,0.5888);
  assert.deepEqual(v.effects.candidateMinimumRequired,['target','clock']);
});
test('postcutoff reading cannot overwrite prior-time view',()=>{
  const f=clone();
  f.readings.push({
    id:'LAB-SYN-SRC-POST',dimensionId:'lab:source',value:0,
    occurredAt:'2026-10-06T13:00:00Z',knownAt:'2026-10-08T01:00:00Z',
    epistemicClass:'SIMULATED',
  });
  const v=evaluateSyntheticTemporalVector(f);
  assert.equal(v.status,'READY');
  assert.equal(v.sourceReadingId,'LAB-SYN-SRC-001');
  assert.equal(v.predictedAggravationRisk.fullVectorClockCandidate,0.5888);
});
test('cannot use solely after-cutoff information and must abstain instead of backfilling',()=>{
  const f=clone();
  f.readings=f.readings.filter(r=>r.dimensionId==='lab:target');
  f.readings.push({
    id:'LAB-SYN-SRC-POST',dimensionId:'lab:source',value:0.9,
    occurredAt:'2026-10-06T10:00:00Z',knownAt:'2026-10-08T01:00:00Z',
    epistemicClass:'SIMULATED',
  });
  const v=evaluateSyntheticTemporalVector(f);
  assert.equal(v.status,'BLOCKED');
  assert.ok(v.reasons.includes('REQUIRED_PRE_T0_READING_MISSING'));
  assert.equal(v.predictedAggravationRisk.fullVectorClockCandidate,null);
});
test('unknown latency or missing coefficient stays blocked, never defaults to a fabricated number',()=>{
  for(const key of ['lag','gain','magnitude','attenuation'] as const){
    const f=clone();f.transfer[key]=null;
    assert.equal(evaluateSyntheticTemporalVector(f).status,'BLOCKED',key);
  }
});
test('latent link known only after T0 cannot yield predictive credit',()=>{
  const f=clone();f.latent.knownAt='2026-10-08T00:00:00Z';
  const v=evaluateSyntheticTemporalVector(f);
  assert.equal(v.status,'BLOCKED');
  assert.ok(v.reasons.includes('LATENT_DEPENDENCY_NOT_DECLARED_BEFORE_T0'));
});
test('rejects real-evidence class, unsupported lags, silently assumed conservation and permission elevation',()=>{
  const f=clone();f.transfer.evidenceRefs=[{id:'root_evidence_fake'}];
  assert.equal(evaluateSyntheticTemporalVector(f).status,'BLOCKED');
  const g=clone();g.transfer.conservationAssumed=true as false;
  assert.equal(evaluateSyntheticTemporalVector(g).status,'BLOCKED');
  const h=clone();h.transfer.lagUnit='days';
  assert.equal(evaluateSyntheticTemporalVector(h).status,'BLOCKED');
  const j=clone();j.dataClass='OBSERVED' as 'SYNTHETIC_ONLY';
  assert.equal(evaluateSyntheticTemporalVector(j).status,'BLOCKED');
});
test('no actual intervention is made even when candidate intensity is 1',()=>{
  const v=evaluateSyntheticTemporalVector(caseFixture());
  assert.equal(v.realExecution,false);
  assert.equal(v.observedReturn,null);
  assert.equal(v.canPromoteCanon,false);
});
test('synthetic outcome scoring is separate from predicting and never returns observed evidence',()=>{
  const f=caseFixture();
  const prediction=evaluateSyntheticTemporalVector(f);
  const scored=scoreSyntheticOutcome(prediction,{
    caseId:f.caseId,outcomeClass:'SIMULATED',aggravation:true,
  });
  assert.equal(scored.noInteractionAblation,0.64);
  assert.equal(scored.fullVectorClockCandidate,0.169085);
  assert.equal(scored.resultIsScientificValidation,false);
  assert.equal(scored.realityChainEligible,false);
  const x=clone();x.latent.knownAt='2026-10-08T00:00:00Z';
  assert.throws(()=>scoreSyntheticOutcome(evaluateSyntheticTemporalVector(x),{
    caseId:x.caseId,outcomeClass:'SIMULATED',aggravation:false,
  }),/SCORING_REQUIRES_READY/);
});
