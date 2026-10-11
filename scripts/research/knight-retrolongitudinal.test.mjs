import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOfficialDossier} from './mihmt-knight-official.mjs';
import {reconstructKnightFromReturn,assertRetroBoundaries} from './knight-retrolongitudinal.mjs';

const d=loadOfficialDossier();
const asOf=(day)=>reconstructKnightFromReturn(d,{asOfLocal:day});

test('real SEC/EDGAR case accepted for return-anchored RETROLONGITUDINAL reconstruction, no future human target',()=>{
 const r=asOf('2013-10-17');
 assert.equal(r.dataClass,'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION');
 assert.equal(r.status,'ACCEPTED_FOR_DOCUMENTARY_RECONSTRUCTION');
 assert.equal(r.admittedStudyMode,'RETROLONGITUDINAL');
 assert.equal(r.temporalBasis,'RECONSTRUCTED_TIME');
 assert.equal(r.physicalCausationDirection,'FORWARD_IN_TIME_ONLY');
 assert.equal(r.futureHumanDecisionRequired,false);
 assert.equal(r.frozenDT_EXP_001_ConfirmatoryValidation,false);
 assert.equal(assertRetroBoundaries(r),true);
});
test('past outcome cannot be presented as observed at a preincident public cutoff',()=>{
 const r=asOf('2012-08-01');
 assert.equal(r.status,'BLOCKED_NO_DOCUMENTED_OUTCOME_AT_CUTOFF');
 assert.equal(r.outcome.evidence,null);
 assert.equal(r.outcome.sfiObservedReturn,false);
 assert.equal(r.reverseSequence.find(s=>s.stage==='INTERVENTION_AND_EXECUTION').sourceFacts.length,0);
 assert.equal(r.supportedLinks.length,0);
});
test('initial issuer return is real documented but provides no SEC 2013 causal reconstruction',()=>{
 const r=asOf('2012-08-03');
 assert.equal(r.status,'ACCEPTED_FOR_DOCUMENTARY_RECONSTRUCTION');
 assert.equal(r.outcome.evidence.factId,'F10');
 assert.equal(r.outcome.measurePrecision,'APPROXIMATELY_440M_USD_PRETAX');
 assert.equal(r.reverseSequence.find(s=>s.stage==='SYSTEM_CONFIGURATION').sourceFacts.length,0);
 assert.equal(r.candidateRetrodictions[0].status,'PARTIALLY_DOCUMENTED');
});
test('post-SEC cutoff supports original incident chronology with documented dates, no rewritten observation',()=>{
 const r=asOf('2013-10-17');
 assert.equal(r.outcome.evidence.factId,'F12');
 assert.equal(r.outcome.evidence.sourcePublishedOn,'2013-10-16');
 assert.equal(r.outcome.measurePrecision,'MORE_THAN_460M_USD');
 const inter=r.reverseSequence.find(s=>s.stage==='INTERVENTION_AND_EXECUTION');
 assert.equal(inter.status,'SOURCE_DOCUMENTED');
 assert.deepEqual(inter.sourceFacts.map(s=>s.factId),['F07','F09']);
 assert.equal(inter.sourceFacts[1].sourceLocator,'SEC order ¶27');
 assert.equal(inter.sourceFacts[1].historicActorKnownAt,'UNKNOWN');
});
test('retrospective SEC action does not fabricate authorizer, actual thought or rejected alternatives',()=>{
 const r=asOf('2013-10-17');
 assert.equal(r.historicalAuthority.exactAuthorizer,null);
 assert.equal(r.historicalAuthority.authenticAuthorizationReceipt,null);
 assert.equal(r.historicalInternalInference.contemporaneousAgentOrHumanInferenceReceipt,null);
 assert.equal(r.candidateRetrodictions[1].status,'NOT_ESTABLISHED_BY_DOCUMENTS');
 assert.equal(r.candidateRetrodictions[1].supportingFacts.length,0);
});
test('falsified authority or minted RETURN fails closed',()=>{
 const x=asOf('2013-10-17');
 x.historicalAuthority.authenticAuthorizationReceipt='FAKE';
 assert.throws(()=>assertRetroBoundaries(x),/ILLEGITIMATE/);
 const y=asOf('2013-10-17');
 y.observedSfiReturnMinted=true;
 assert.throws(()=>assertRetroBoundaries(y),/ILLEGITIMATE/);
});
test('historical explanatory replay is not prospectively validated by source-only temporal cutoff',()=>{
 const r=asOf('2013-10-17');
 assert.equal(r.forwardReplay.prospectiveScientificForecast,false);
 assert.equal(r.forwardReplay.availableOfficialCaseMechanics,'NONE_IN_PUBLIC_SOURCE_VINTAGE');
 assert.equal(r.scientificValidation,'NOT_ESTABLISHED');
 assert.equal(r.realityChainEligible,false);
});
test('one real historical return is kept as external documented outcome, not a SFI-created fact',()=>{
 const r=asOf('2013-10-17');
 assert.equal(r.outcome.kind,'EXTERNAL_DOCUMENTED_REAL_WORLD_OUTCOME');
 assert.equal(r.outcome.mintsNewReturn,false);
 assert.equal(r.outcome.sfiObservedReturn,false);
 assert.equal(r.canonicalEvidenceInserted,false);
 assert.equal(r.actualExecutionPerformed,false);
});
