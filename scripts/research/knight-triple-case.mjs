/**
 * SFI Real Knight 2012: ONE OFFICIAL CASE / THREE NON-INTERCHANGEABLE LENSES.
 * Read-only; no methods registry, no canonical evidence, no experimental scoring,
 * no Reality Chain mutation, no invented actor cognition/authorization/RETURN.
 * Original official source inventory and as-of semantics owned by mihmt-knight-official.mjs.
 */
import { pathToFileURL } from 'node:url';
import { loadOfficialDossier, sourceViewAsOf } from './mihmt-knight-official.mjs';

export const TRIPLE_CASE_CONTRACT = 'SFI-REAL-HISTORICAL-TRIPLE-CASE-1.0';
const KNIGHT_CASE='SFI-MIHMT-KNIGHT-2012-SEC-001';

const contains=(view,id)=>view.findings.some(f=>f.id===id);
const backing=(view,ids)=>{
 const findings=ids.map(id=>view.findings.find(f=>f.id===id)).filter(Boolean);
 return {
   referencedFindingIds: findings.map(f=>f.id),
   documentarySupport:findings.map(f=>({
     findingId:f.id,
     originSourceId:f.sourceId,
     sourceLocator:f.locator,
     sourceClass:f.assertionClass,
     eventOn:f.eventOn,
     publiclyAvailableFrom:view.sources.find(s=>s.id===f.sourceId)?.publicAvailableFrom??null,
     historicallyKnownToSpecificActor:'UNKNOWN_NOT_ESTABLISHED',
   })),
   materialMissing:findings.length!==ids.length,
 };
};
const status=(yes,yesState,noState)=>yes?yesState:noState;
const bound=(id,condition,description)=>({id,condition,description});

export function evaluateKnightTripleCase(dossier,{asOfLocal='2013-10-17'}={}){
 if(dossier.caseId!==KNIGHT_CASE)throw Error('TRIPLE_CASE_ID_MISMATCH');
 const view=sourceViewAsOf(dossier,asOfLocal);
 const sec=contains(view,'F09')&&contains(view,'F04')&&contains(view,'F05');
 const warning=backing(view,['F05']);
 const action=backing(view,['F09']);
 const dormant=backing(view,['F02','F03','F04','F06']);
 const admissibleIds=view.findings.map(x=>x.id);
 const readableSources=view.sources.map(x=>({
   sourceId:x.id,issuer:x.issuer,publicAvailableFrom:x.publicAvailableFrom,
   sourceType:x.kind,officialUrl:x.url
 }));
 const envelope={
   contract:TRIPLE_CASE_CONTRACT,
   caseId:dossier.caseId,
   dataClass:'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION',
   asOfLocal,
   temporalBasis:'PUBLICATION_DATE_BOUND_PUBLIC_VIEW_NOT_ACTOR_KNOWLEDGE',
   exactIntradayKnownAt:'NOT_ESTABLISHED',
   sharedOfficialSources:readableSources,
   admissibleFindingIds:admissibleIds,
   realSourceDocumentCount:view.sources.length,
   documentedFactCount:view.findings.length,
   researchOnly:true,
   sharedExperimentalScore:null,
   crossExperimentValidation:false,
   canonicalEvidenceEntryIds:[],
   canonicalPhi:null,
   observedSfiReturn:null,
   realityChainAdmission:false,
   methodLabOutcomeReceipt:null,
   frozenContractsModified:false,
   limitations:[
     'Known public source is not identical to internal employee knowledge at the time.',
     'October 2013 SEC findings cannot be inserted into an August 2012 public as-of state.',
     'An official retrospective finding is not first-hand SFI observation.',
     'The incident is already publicly known; present-day LLM predictions about 2012 are subject to training-knowledge leakage.',
   ]
 };

 const MIHM_T={
   trackId:'MIHM-T',
   owningProtocol:'SFI-MIHM-T-EXP-001',
   protocolStatus:'DRAFT_UNFROZEN',
   question:'Which documentable latent dependencies, clocks, signals and interventions formed the historical system trajectory?',
   studyMode:'RETROSPECTIVE_HISTORICAL_DOCUMENTARY_RECONSTRUCTION',
   stage:status(sec,'OFFICIAL_CAUSE_AND_ACTION_READABLE_FROM_2013_SOURCE','PUBLIC_AS_OF_CAUSAL_MECHANISM_UNAVAILABLE'),
   sourceBackedClaims:[
     {id:'LATENT_SOFTWARE',...dormant,interpretationState:'REGULATORY_RETROSPECTIVE_FINDINGS_NOT_PRE_INCIDENT_PUBLIC'},
     {id:'PREMARKET_WARNING',...warning,interpretationState:contains(view,'F05')?'DOCUMENTED_INTERNAL_EMAIL_GENERATION_NOT_PROVEN_READ':'NOT_PUBLICLY_DOCUMENTED_AS_OF_CUTOFF'},
     {id:'AGGRAVATING_OPERATION',...action,interpretationState:contains(view,'F09')?'SEC_RETROSPECTIVE_AGGRAVATION_FINDING':'NOT_PUBLICLY_DOCUMENTED_AS_OF_CUTOFF'},
   ],
   observedUnits:view.documentedQuantities.map(q=>({
     variable:q.measure,dimension:q.dimension,value:q.value,unit:q.unit,
     comparator:q.operator,sourceFindingId:q.findingRef
   })),
   hypothesesToContrast:[
     bound('M1','LATENT_AND_CLOCK_INTERACTION','A pre-existing software dependency changes the effect of the proposed operational intervention; must be evaluated against competent M0 with same T0 data.'),
     bound('M0','COMPETENT_CONVENTIONAL_CONTROLS','Conventional safety/incident analysis explains the event without incremental MIHM-T forecast advantage.'),
   ],
   realEvent:true,
   prospectiveTest:false,
   competentM0Executed:false,
   modelCoefficientsCalibrated:false,
   independentlyObservedCounterfactual:false,
   epistemicStatus:'OFFICIAL_DOCUMENTARY_RECONSTRUCTION_NOT_VALIDATED_MIHMT',
 };

 const LCI={
   trackId:'LCI',
   owningProtocol:'experiments/lci/preregistration-v0.1.json',
   subject:'CT-A01',
   protocolStatus:'PREREGISTERED_EXPERIMENTAL_REPOSITORY_STATUS',
   question:'Can verified CT-A01 developmental biography add out-of-sample reconstructive or predictive information over matched controls?',
   studyMode:'CASE_MATERIAL_FOR_FUTURE_AGENT_EVALUATION_ONLY',
   stage:'BLOCKED_NO_VERIFIED_AGENT_BIOGRAPHY_OR_INDEPENDENT_HOLDOUT',
   knightIsArtificialSubject:false,
   historicalKnightFactsAreAgentBiography:false,
   requiredIndependentInputs:[
     'Real CT-A01 developmental event ledger and versioned source/authority receipts',
     'Controlled CT-B01 and CT-C01 comparable runs and random/matched biography controls',
     'Information-matched baseline, seed, model and context conditions',
     'Previously sealed subject-specific out-of-sample target independent of known Knight outcome',
     'Qualified execution/return receipts and reproducibility record',
   ],
   estimableMetrics:[],
   metricsNotComputable:['BPA','CLS','TCI','CAE','RRA','ALI'],
   subjectRunVerified:false,
   validationResult:'NOT_ESTABLISHED',
   realCaseAsStudyStimulus:true,
   publicCaseLeakageRisk:true,
   methodologicalUse:'Documentary scenario may define a common task stimulus AFTER a genuine CT-A01 history is supplied; never substitute public case chronology for that history.',
 };

 const DECISION_TRANSFER={
   trackId:'SFI-DT EXP-001',
   owningProtocol:'docs/research/decision-transfer/SFI-DT-EXP-001-FREEZE-CURRENT.md',
   protocolStatus:'EXPERIMENTALLY_FROZEN_AWAITING_NATURALISTIC_TARGET',
   question:'What can the surviving real-world records establish about the structure of the historical human response decision?',
   studyMode:'RETROSPECTIVE_DESCRIPTIVE_DECISION_TRACE_ONLY',
   stage:contains(view,'F09')?'PARTIAL_DECISION_OPERATION_DOCUMENTED_WITHOUT_INTERNAL_HUMAN_TRACE':'NO_HISTORICAL_ACTION_VISIBLE_AS_OF_CUTOFF',
   historicalAction:contains(view,'F09')?{
     kind:'REMOVAL_OF_RLP_CODE_ON_SEVEN_UPDATED_SERVERS',
     evidence:action.documentarySupport,
     actionClaimStatus:'SEC_RETROSPECTIVE_FINDING',
     exactDecisionTime:null,
     humanDecisionOwner:null,
     actualAuthorizer:null,
     authorizationReceipt:null,
     recordedRationale:null,
     realWorldConsequence:'SEC_REPORTED_AGGRAVATION_NOT_QUANTIFIED_BY_INTERVENTION'
   }:null,
   // Five fields used by the frozen endpoint. Do NOT score or impute missing ones.
   structuralFields:{
     disposition:{state:'UNKNOWN',value:null},
     operations:{state:contains(view,'F09')?'OFFICIAL_RETROSPECTIVE_OPERATION':'NOT_DOCUMENTED_AS_OF_CUTOFF',
       value:contains(view,'F09')?'Removal of RLP code on seven correctly updated servers':null,
       sourceFindingIds:action.referencedFindingIds},
     relevantVariables:{state:contains(view,'F04')&&contains(view,'F09')?'PARTIALLY_DOCUMENTED':'UNKNOWN',value:null,
       sourceFindingIds:backing(view,['F04','F09']).referencedFindingIds},
     rejectedConditions:{state:'UNKNOWN',value:null},
     decisionChangeCues:{state:'UNKNOWN',value:null}
   },
   prospectiveTargetRegistered:false,
   targetFromFuture:false,
   futureTargetTimingProof:null,
   humanDecisionExposureToPrediction:'NOT_APPLICABLE_HISTORICAL',
   frozenArmsModified:false,
   validatedStructuralFidelity:null,
   primaryComparisonCTvsB5:null,
   confirmatoryEligible:false,
   outcomeClass:'DESCRIPTIVE_ONLY_NO_EXP001_SCORE',
 };
 const result={...envelope,tracks:[MIHM_T,LCI,DECISION_TRANSFER],
   tracking:{
     convergence:'THREE_INDEPENDENT_QUESTIONS_ONE_SHARED_CASE',
     pems:'ONLY_CANDIDATE_PROPERTY_NOT_MEASURED',
     invariants:[
       'SOURCE_PROVENANCE_MUST_SURVIVE',
       'KNOWLEDGE_TIME_NOT_INFERRED_FROM_EVENT_TIME',
       'HUMAN_AUTHORITY_CANNOT_BE_GUESSED',
       'REAL_DATA_NOT_SYNTHETIC',
       'NO_AUTOMATIC_REALITY_CHAIN_ADMISSION',
       'RETROSPECTIVE_DOES_NOT_MEET_PROSPECTIVE_CONFIRMATORY_GATE',
       'LCI_AGENT_BIOGRAPHY_IS_NOT_INCIDENT_HISTORY',
     ],
     nextActions:[
       'Conduct full source/paragraph audit and identify missing primary receipts for time, action, authorization.',
       'Run a documented conventional M0 retrospective explanation before considering incremental MIHM-T model claims.',
       'Acquire real agent developmental logs and independent holdouts before LCI scoring.',
       'Register a genuinely future naturalistic human target for frozen SFI-DT EXP-001.',
     ],
   }
 };
 assertTripleBoundaries(result);
 return result;
}

export function assertTripleBoundaries(result){
 if(result.contract!==TRIPLE_CASE_CONTRACT || result.dataClass!=='REAL_HISTORICAL_OFFICIAL_DOCUMENTATION')throw Error('INVALID_REAL_TRIPLE_CASE');
 if(result.realityChainAdmission!==false || result.sharedExperimentalScore!==null ||
   result.canonicalPhi!==null || result.observedSfiReturn!==null ||
   result.canonicalEvidenceEntryIds?.length!==0)throw Error('TRIPLE_CASE_CONFLATED_WITH_EVIDENCE_OR_SCORE');
 const ids=result.tracks?.map(t=>t.trackId);
 if(JSON.stringify(ids)!==JSON.stringify(['MIHM-T','LCI','SFI-DT EXP-001']))throw Error('TRIPLE_TRACKS_MISSING_OR_CHANGED');
 const [mihm,lci,dt]=result.tracks;
 if(lci.knightIsArtificialSubject!==false || lci.subjectRunVerified!==false ||
    lci.metricsNotComputable?.length!==6 || dt.confirmatoryEligible!==false ||
    dt.validatedStructuralFidelity!==null || dt.frozenArmsModified!==false ||
    mihm.prospectiveTest!==false || mihm.competentM0Executed!==false)throw Error('INVALID_EXPERIMENTAL_PROMOTION');
 return true;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const d=loadOfficialDossier();
 for(const asOfLocal of ['2012-08-01','2012-08-03','2013-10-17']){
   const result=evaluateKnightTripleCase(d,{asOfLocal});
   const printed={
     caseId:result.caseId,asOfLocal:result.asOfLocal,
     dataClass:result.dataClass,sourceCount:result.sharedOfficialSources.length,
     documentedFacts:result.documentedFactCount,
     tracks:result.tracks.map(t=>({
       id:t.trackId,stage:t.stage,mode:t.studyMode,
       eligible:t.confirmatoryEligible??t.prospectiveTest??false
     })),
     resultValidatesExperiment:result.crossExperimentValidation,
     realityChainAdmission:result.realityChainAdmission
   };
   process.stdout.write(JSON.stringify(printed)+'\n');
 }
}
