/**
 * Real historical Knight Capital retrocausal (inverse-explanatory) reconstruction.
 * Executes DIOL_RETROLONGITUDINAL using the existing SEC/EDGAR documentary case.
 * Actual causal events remain FORWARD in time. "Retrocausal" refers to the
 * analytical direction: from known later effects to candidate earlier conditions.
 * Pure/read-only; never invent execution, source, person, authority or RETURN.
 */
import { pathToFileURL } from 'node:url';
import { loadOfficialDossier, sourceViewAsOf } from './mihmt-knight-official.mjs';

export const KNIGHT_RETRO_CONTRACT='SFI-KNIGHT-RETROLONGITUDINAL-CASE-1.0';
const f=(v,id)=>v.findings.find(x=>x.id===id)||null;
const cite=(v,id)=>{
  const finding=f(v,id);
  if(!finding)return null;
  const source=v.sources.find(s=>s.id===finding.sourceId);
  if(!source)throw Error('FINDING_WITHOUT_ADMISSIBLE_SOURCE:'+id);
  return {
    factId:id,
    proposition:finding.statement,
    eventOn:finding.eventOn,
    sourceId:source.id,
    sourceLocator:finding.locator,
    sourcePublishedOn:source.publicAvailableFrom,
    claimClass:finding.assertionClass,
    sfiDirectlyObserved:false,
    historicActorKnownAt:'UNKNOWN',
  };
};
const refs=(v,ids)=>ids.map(x=>cite(v,x)).filter(Boolean);
const step=(stage,v,ids,requireAll=true)=>{
  const sources=refs(v,ids);
  return {
    stage,recordClass:'RETROSPECTIVE_DOCUMENTARY',
    status:sources.length===0?'UNAVAILABLE_AS_OF_SOURCE_CUTOFF':
      requireAll&&sources.length!==ids.length?'PARTIALLY_DOCUMENTED':'SOURCE_DOCUMENTED',
    sourceFacts:sources,
    missingFactIds:ids.filter(x=>!f(v,x)),
  };
};

export function reconstructKnightFromReturn(dossier,{asOfLocal='2013-10-17'}={}){
  const v=sourceViewAsOf(dossier,asOfLocal);
  const outcome=f(v,'F12')?cite(v,'F12'):cite(v,'F10');
  const returnAnchor=outcome?{
    kind:'EXTERNAL_DOCUMENTED_REAL_WORLD_OUTCOME',
    status:'DOCUMENTED_BY_REGULATOR_OR_ISSUER',
    evidence:outcome,
    sfiObservedReturn:false,
    mintsNewReturn:false,
    describedSystemOutcome:'documented substantial trading loss following order-system malfunction',
    measurePrecision:outcome.factId==='F12'?'MORE_THAN_460M_USD':'APPROXIMATELY_440M_USD_PRETAX',
  }:{
    kind:'EXTERNAL_DOCUMENTED_REAL_WORLD_OUTCOME',status:'NO_OUTCOME_AVAILABLE_AT_DOCUMENT_CUTOFF',
    evidence:null,sfiObservedReturn:false,mintsNewReturn:false,
    describedSystemOutcome:null,measurePrecision:null,
  };
  const backwards=[
    step('RETURN',v,outcome?[outcome.factId]:[]),
    step('INTERVENTION_AND_EXECUTION',v,['F07','F09']),
    step('PRECURSOR_SIGNAL',v,['F05']),
    step('SYSTEM_CONFIGURATION',v,['F02','F03','F04','F06']),
    step('EXISTING_CONTROL_BOUNDARIES',v,['F08','F14'])
  ];
  const authority={
    stage:'AUTHORITY',
    status:'UNKNOWN_NOT_ESTABLISHED_BY_SOURCED_RECORDS',
    exactAuthorizer:null,
    authenticAuthorizationReceipt:null,
    scopeOfAuthority:null,
    noActorIdentityInferred:true
  };
  const historicalInference={
    stage:'HISTORICAL_INTERNAL_INFERENCE',
    status:'NOT_OBSERVED',
    contemporaneousAgentOrHumanInferenceReceipt:null,
    propositionBySfi:'Possible perception of warning or reason for rollback cannot be asserted without original operator records.',
    outputMayOnlyBe:'HYPOTHESIS_NOT_HISTORICAL_FACT'
  };
  const documentedLinks=v.relations.filter(r=>
    backwards.some(b=>b.sourceFacts.some(x=>x.factId===r.source)) &&
    backwards.some(b=>b.sourceFacts.some(x=>x.factId===r.target)))
    .map(r=>({
      id:r.id,
      sourceFactId:r.source,targetFactId:r.target,
      relationClass:r.type,sourceQualifier:r.qualifier,
      causalConclusionStatus:r.type==='DOCUMENTED_AGGRAVATION_DURING_INCIDENT'
        ? 'SEC_REGULATORY_FINDING_NO_INDEPENDENT_COUNTERFACTUAL'
        : 'DOCUMENTARY_RELATION_NOT_PROVEN_COUNTERFACTUAL',
    }));
  const retrodictions=[
    {
      id:'R1',kind:'SOURCE_CONSTRAINED_RECONSTRUCTION',
      status:refs(v,['F04','F06','F07','F09']).length===4?'SOURCE_SUPPORTED_RETROSPECTIVE_SEQUENCE':'PARTIALLY_DOCUMENTED',
      proposition:'Historical server deployment inconsistency and dormant Power Peg were followed by erroneous routing and a response that the SEC later found aggravated the disruption.',
      supportingFacts:refs(v,['F04','F06','F07','F09']),
      noFactualInferenceBeyondSources:true,
      originalAuthorizationKnown:false
    },{
      id:'R2',kind:'RIVAL_EXPLANATION_GAP',
      status:'NOT_ESTABLISHED_BY_DOCUMENTS',
      proposition:'Alternative operator intentions, approval process and counterfactual remedies cannot be reconstructed as occurrences without source receipts.',
      supportingFacts:[],
      missingEvidence:['contemporaneous approval receipt','operator diagnostic decision transcript','original rollback action log','independently identified no-rollback outcome'],
      noFactualInferenceBeyondSources:true,
    }
  ];
  const nextTest={
    mode:'RETROSPECTIVE_T0_REPLAY',
    cutoff:'2012-08-01',
    availableOfficialCaseMechanics:'NONE_IN_PUBLIC_SOURCE_VINTAGE',
    hypothesesOnly:true,
    prospectiveScientificForecast:false,
    disclaimer:'A model asked today to predict a 2012 published incident may remember the later outcome in pretrained weights. T0 filtering the prompt cannot repair model pretraining contamination.'
  };
  const result={
    contract:KNIGHT_RETRO_CONTRACT,
    caseId:dossier.caseId,
    dataClass:'REAL_HISTORICAL_OFFICIAL_DOCUMENTATION',
    admittedStudyMode:'RETROLONGITUDINAL',
    temporalBasis:'RECONSTRUCTED_TIME',
    analyticDirection:'FROM_REAL_DOCUMENTED_OUTCOME_BACK_TO_POSSIBLE_PRECONDITIONS',
    physicalCausationDirection:'FORWARD_IN_TIME_ONLY',
    asOfLocal,sourceCutoffRule:v.availabilityRule,
    status:returnAnchor.evidence?'ACCEPTED_FOR_DOCUMENTARY_RECONSTRUCTION':'BLOCKED_NO_DOCUMENTED_OUTCOME_AT_CUTOFF',
    outcome:returnAnchor,
    reverseSequence:backwards,
    historicalAuthority:authority,
    historicalInternalInference:historicalInference,
    supportedLinks:documentedLinks,
    candidateRetrodictions:retrodictions,
    forwardReplay:nextTest,
    scientificValidation:'NOT_ESTABLISHED',
    futureHumanDecisionRequired:false,
    frozenDT_EXP_001_ConfirmatoryValidation:false,
    canonicalEvidenceInserted:false,
    observedSfiReturnMinted:false,
    actualExecutionPerformed:false,
    realityChainEligible:false,
    notes:[
      'Real documents and reported historical outcomes are not synthetic.',
      'Retrodicted unobserved operations/inferences remain hypotheses, not history.',
      'Source public publication date never backdates to original event time.',
      'An ACCEPTED research case is not an ACCEPTED confirmatory experiment.'
    ]
  };
  assertRetroBoundaries(result);
  return result;
}
export function assertRetroBoundaries(r){
  if(r.contract!==KNIGHT_RETRO_CONTRACT||
    r.dataClass!=='REAL_HISTORICAL_OFFICIAL_DOCUMENTATION'||
    r.admittedStudyMode!=='RETROLONGITUDINAL'||
    r.physicalCausationDirection!=='FORWARD_IN_TIME_ONLY')throw Error('INVALID_RETRO_CASE');
  if(r.futureHumanDecisionRequired!==false||
    r.frozenDT_EXP_001_ConfirmatoryValidation!==false||
    r.canonicalEvidenceInserted!==false||
    r.observedSfiReturnMinted!==false||
    r.realityChainEligible!==false||
    r.actualExecutionPerformed!==false||
    r.historicalAuthority.authenticAuthorizationReceipt!==null||
    r.historicalInternalInference.contemporaneousAgentOrHumanInferenceReceipt!==null)throw Error('ILLEGITIMATE_RETRO_EVIDENCE_OR_AUTHORITY');
  if(r.outcome.evidence&&r.status!=='ACCEPTED_FOR_DOCUMENTARY_RECONSTRUCTION')throw Error('RETURN_STATE_MISMATCH');
  if(!r.outcome.evidence&&r.status!=='BLOCKED_NO_DOCUMENTED_OUTCOME_AT_CUTOFF')throw Error('RETURN_STATE_MISMATCH');
  return true;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const d=loadOfficialDossier();
 for(const asOfLocal of ['2012-08-01','2012-08-03','2013-10-17']){
  const r=reconstructKnightFromReturn(d,{asOfLocal});
  process.stdout.write(JSON.stringify({
    caseId:r.caseId,asOfLocal:r.asOfLocal,study:r.admittedStudyMode,
    state:r.status,documentedOutcomeFact:r.outcome.evidence?.factId??null,
    documentedStages:r.reverseSequence.filter(s=>s.status==='SOURCE_DOCUMENTED').map(s=>s.stage),
    partialStages:r.reverseSequence.filter(s=>s.status==='PARTIALLY_DOCUMENTED').map(s=>s.stage),
    authority:r.historicalAuthority.status,
    historicalInference:r.historicalInternalInference.status,
    sfiReturnMinted:r.observedSfiReturnMinted
  })+'\n');
 }
}
