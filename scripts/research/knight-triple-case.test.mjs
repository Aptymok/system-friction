import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOfficialDossier} from './mihmt-knight-official.mjs';
import {evaluateKnightTripleCase,assertTripleBoundaries,TRIPLE_CASE_CONTRACT} from './knight-triple-case.mjs';

const dossier=loadOfficialDossier();
const view=(asOfLocal)=>evaluateKnightTripleCase(dossier,{asOfLocal});
const [MIHM,LCI,DT]=['MIHM-T','LCI','SFI-DT EXP-001'];

test('a single real source dossier yields exactly three distinct research tracks',()=>{
 const x=view('2013-10-17');
 assert.equal(x.contract,TRIPLE_CASE_CONTRACT);
 assert.equal(x.dataClass,'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION');
 assert.equal(x.documentedFactCount,15);
 assert.equal(x.realSourceDocumentCount,5);
 assert.deepEqual(x.tracks.map(t=>t.trackId),[MIHM,LCI,DT]);
 assert.equal(assertTripleBoundaries(x),true);
});
test('pre-incident public cutoff cannot use later secret deployment / warnings / rollback facts',()=>{
 const x=view('2012-08-01');
 assert.deepEqual(x.admissibleFindingIds,['F01']);
 assert.equal(x.tracks[0].stage,'PUBLIC_AS_OF_CAUSAL_MECHANISM_UNAVAILABLE');
 assert.equal(x.tracks[0].sourceBackedClaims[1].referencedFindingIds.length,0);
 assert.equal(x.tracks[0].sourceBackedClaims[2].referencedFindingIds.length,0);
 assert.equal(x.tracks[2].historicalAction,null);
 assert.equal(x.tracks[2].structuralFields.operations.value,null);
 assert.equal(x.sharedOfficialSources.length,1);
});
test('issuer disclosure later in 2012 does not make 2013 regulator findings public',()=>{
 const x=view('2012-08-03');
 assert.ok(x.admissibleFindingIds.includes('F10'));
 assert.ok(!x.admissibleFindingIds.includes('F05'));
 assert.ok(!x.admissibleFindingIds.includes('F09'));
 assert.equal(x.tracks[2].historicalAction,null);
 assert.equal(x.tracks[0].sourceBackedClaims[2].materialMissing,true);
});
test('2013 retrospective records retain SEC source, original issue date and locator',()=>{
 const x=view('2013-10-17');
 const warning=x.tracks[0].sourceBackedClaims[1].documentarySupport[0];
 const rollback=x.tracks[0].sourceBackedClaims[2].documentarySupport[0];
 assert.equal(warning.findingId,'F05');
 assert.equal(warning.sourceLocator,'SEC order ¶19');
 assert.equal(warning.publiclyAvailableFrom,'2013-10-16');
 assert.equal(warning.historicallyKnownToSpecificActor,'UNKNOWN_NOT_ESTABLISHED');
 assert.equal(rollback.findingId,'F09');
 assert.equal(rollback.sourceLocator,'SEC order ¶27');
 assert.equal(rollback.sourceClass,'REGULATORY_FINDING');
});
test('MIHM-T provides original-unit quantities, no fabricated phi, and no competent M0 scored',()=>{
 const x=view('2013-10-17');
 assert.equal(x.tracks[0].observedUnits.length,11);
 const email=x.tracks[0].observedUnits.find(q=>q.variable==='pre_open_bnet_reject_emails');
 assert.equal(email.value,97);
 assert.equal(email.unit,'emails');
 assert.equal(x.tracks[0].competentM0Executed,false);
 assert.equal(x.tracks[0].modelCoefficientsCalibrated,false);
 assert.equal(x.canonicalPhi,null);
});
test('LCI must not silently count Knight system history as CT-A01 biography',()=>{
 for(const day of ['2012-08-01','2013-10-17']){
 const x=view(day), lci=x.tracks[1];
 assert.equal(lci.subject,'CT-A01');
 assert.equal(lci.historicalKnightFactsAreAgentBiography,false);
 assert.equal(lci.knightIsArtificialSubject,false);
 assert.equal(lci.subjectRunVerified,false);
 assert.deepEqual(lci.estimableMetrics,[]);
 assert.deepEqual(lci.metricsNotComputable,['BPA','CLS','TCI','CAE','RRA','ALI']);
 assert.equal(lci.validationResult,'NOT_ESTABLISHED');
 }
});
test('DT historical action can be documented without reconstructing unknown human intent/authorization',()=>{
 const dt=view('2013-10-17').tracks[2];
 assert.equal(dt.stage,'PARTIAL_DECISION_OPERATION_DOCUMENTED_WITHOUT_INTERNAL_HUMAN_TRACE');
 assert.equal(dt.historicalAction.kind,'REMOVAL_OF_RLP_CODE_ON_SEVEN_UPDATED_SERVERS');
 assert.equal(dt.historicalAction.actualAuthorizer,null);
 assert.equal(dt.historicalAction.authorizationReceipt,null);
 assert.equal(dt.historicalAction.recordedRationale,null);
 assert.equal(dt.structuralFields.operations.state,'OFFICIAL_RETROSPECTIVE_OPERATION');
 assert.equal(dt.structuralFields.disposition.state,'UNKNOWN');
 assert.equal(dt.structuralFields.rejectedConditions.state,'UNKNOWN');
 assert.equal(dt.structuralFields.decisionChangeCues.state,'UNKNOWN');
});
test('DT naturalistic prospective target remains blocked and frozen score cannot be inferred',()=>{
 const dt=view('2013-10-17').tracks[2];
 assert.equal(dt.prospectiveTargetRegistered,false);
 assert.equal(dt.targetFromFuture,false);
 assert.equal(dt.confirmatoryEligible,false);
 assert.equal(dt.frozenArmsModified,false);
 assert.equal(dt.primaryComparisonCTvsB5,null);
 assert.equal(dt.validatedStructuralFidelity,null);
});
test('real official documentation is not SFI first-hand observation or automatically admitted evidence',()=>{
 const x=view('2013-10-17');
 assert.equal(x.researchOnly,true);
 assert.deepEqual(x.canonicalEvidenceEntryIds,[]);
 assert.equal(x.realityChainAdmission,false);
 assert.equal(x.observedSfiReturn,null);
 assert.equal(x.methodLabOutcomeReceipt,null);
 assert.equal(x.sharedExperimentalScore,null);
 assert.equal(x.crossExperimentValidation,false);
});
test('one source-based claim disappearing cannot be replaced with inferred historical facts',()=>{
 const f=structuredClone(dossier);
 f.documentedFindings=f.documentedFindings.filter(x=>x.id!=='F09');
 // Existing relations refer to F09; validation must reject unsupported source relations,
 // not silently keep the claim.
 assert.throws(()=>evaluateKnightTripleCase(f,{asOfLocal:'2013-10-17'}),/UNSUPPORTED_SOURCE_RELATION/);
});
test('a deliberately falsified positive experimental score fails provenance guard',()=>{
 const x=view('2013-10-17');
 x.tracks[2].validatedStructuralFidelity=0.99;
 assert.throws(()=>assertTripleBoundaries(x),/INVALID_EXPERIMENTAL_PROMOTION/);
});
test('a fabricated institutional source entry and a synthetic label are rejected',()=>{
 const f=structuredClone(dossier);
 f.officialSources[0].url='https://invented.example/not-official';
 assert.throws(()=>evaluateKnightTripleCase(f),/INVALID_OFFICIAL_SOURCE/);
 const x=view('2013-10-17');
 x.dataClass='SIMULATED';
 assert.throws(()=>assertTripleBoundaries(x),/INVALID_REAL_TRIPLE_CASE/);
});
