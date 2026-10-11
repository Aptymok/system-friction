// Read-only research document projection for official historical evidence.
// Deliberately separate real historical documentary findings from what a public observer
// could have known on a given past date. NOT an automatic Reality Chain writer.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

export const CONTRACT='SFI-MIHMT-OFFICIAL-HISTORICAL-CASE-1.0';
const YMD=/^\d{4}-\d{2}-\d{2}$/;
const validDay=(s)=>typeof s==='string' && YMD.test(s) &&
  !Number.isNaN(Date.parse(s+'T00:00:00Z')) &&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

export function validateOfficialDossier(d){
  const fail=[];
  if(!d||d.contract!==CONTRACT||d.dataClass!=='REAL_HISTORICAL_OFFICIAL_DOCUMENTATION'||
     d.studyRole!=='RETROSPECTIVE_RECONSTRUCTION_AND_CALIBRATION_ONLY')fail.push('INVALID_REAL_HISTORICAL_DOSSIER_CONTRACT');
  const p=d?.sourcePolicies||{};
  for(const key of ['sourceDocumentIsReal','acceptedForWorkingAnalysis','documentFoundTodayIsNotAvailableAtHistoricalT0','sourceDocumentDateDoesNotProveTimeOfInternalHumanKnowledge','preserveContradictionsAndEstimateRevisions','noFabricatedTimestampOrAuthority']){
    if(p[key]!==true)fail.push('SOURCE_POLICY_REQUIRED:'+key);
  }
  for(const key of ['acceptedIntoCanonicalRealityChain','canonicalEvidenceMinted','regulatoryFindingIsDirectSfiObservation','actualAgentInferenceRecorded','forecastConfirmatoryEligible','comparisonAgainstCompetentM0Completed','originalSecuritiesOrdersOrSystemLogsAccessibleToSfi']){
    if(p[key]!==false)fail.push('FORBIDDEN_OR_UNPROVEN_STATUS:'+key);
  }
  if(!Array.isArray(d?.officialSources)||d.officialSources.length<2 ||
    !Array.isArray(d?.documentedFindings)||d.documentedFindings.length<1 ||
    !Array.isArray(d?.dimensionalReadings)||!Array.isArray(d?.relationships))fail.push('SOURCES_FINDINGS_AND_VECTOR_REQUIRED');
  if(fail.length)throw Error(fail.join(','));
  const sources=new Map();
  for(const s of d.officialSources){
    if(!s.id||sources.has(s.id)||!/^https:\/\/www\.sec\.gov\//.test(s.url)||
       !validDay(s.publicAvailableFrom)||!validDay(s.documentDate)||!s.dateBasis||!s.kind)fail.push('INVALID_OFFICIAL_SOURCE:'+s.id);
    sources.set(s.id,s);
  }
  const facts=new Map();
  for(const f of d.documentedFindings){
    if(!f.id||facts.has(f.id)||!sources.has(f.sourceId)||!f.locator||!f.statement||
       !['REGULATORY_FINDING','REGULATORY_ORDER','ISSUER_DISCLOSURE'].includes(f.assertionClass)||
       !/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(f.eventOn))fail.push('UNSUPPORTED_FINDING:'+f.id);
    const src=sources.get(f.sourceId);
    if(src&&f.assertionClass==='ISSUER_DISCLOSURE'&&!src.kind.startsWith('SEC_EDGAR_ISSUER'))fail.push('ISSUER_CLAIM_WRONG_SOURCE:'+f.id);
    if(src&&f.assertionClass==='REGULATORY_FINDING'&&src.kind!=='SEC_ADMINISTRATIVE_ORDER')fail.push('REGULATOR_CLAIM_WRONG_SOURCE:'+f.id);
    facts.set(f.id,f);
  }
  for(const v of d.dimensionalReadings){
    if(!v.id||!facts.has(v.findingRef)||!Number.isFinite(v.value)||
       !['EQUALS','GREATER_THAN','APPROXIMATELY'].includes(v.operator)||!v.unit||!v.dimension||
       'phi' in v||'confidence' in v)fail.push('UNSUPPORTED_DOCUMENTED_QUANTITY:'+v.id);
  }
  for(const relation of d.relationships){
    if(!relation.id||!facts.has(relation.source)||!facts.has(relation.target)||
       !relation.qualifier)fail.push('UNSUPPORTED_SOURCE_RELATION:'+relation.id);
  }
  if(fail.length)throw Error(fail.join(','));
  return d;
}

export function sourceViewAsOf(d,asOfLocal){
  validateOfficialDossier(d);
  if(!validDay(asOfLocal))throw Error('INVALID_AS_OF_DAY');
  // Strictly earlier publication calendar days: never assert a same-day document
  // was available at 09:30 AM without a time-specific public release receipt.
  const included=d.officialSources.filter(s=>s.publicAvailableFrom<asOfLocal);
  const set=new Set(included.map(s=>s.id));
  const findings=d.documentedFindings.filter(f=>set.has(f.sourceId));
  const findingIds=new Set(findings.map(f=>f.id));
  const quantities=d.dimensionalReadings.filter(v=>findingIds.has(v.findingRef));
  const relations=d.relationships.filter(v=>findingIds.has(v.source)&&findingIds.has(v.target));
  const excluded=d.officialSources.filter(s=>!set.has(s.id));
  return {
    contract:'SFI-MIHMT-OFFICIAL-AS-OF-RESEARCH-VIEW-1.0',
    caseId:d.caseId,asOfLocal,
    documentaryClass:'REAL_OFFICIAL_DOCUMENTS',
    analysisType:'PUBLICATION_DATE_BOUND_HISTORICAL_VIEW',
    actualHistoricalOccurrenceNotAutomaticallyKnown:true,
    availabilityRule:'PUBLIC_DOCUMENT_PUBLISHED_STRICTLY_BEFORE_AS_OF_DAY_ONLY',
    acceptedEvidenceRefs:[],
    autoAdmittedToRealityChain:false,
    sources:included,findings,documentedQuantities:quantities,relations,
    excludedSources:excluded.map(s=>({id:s.id,reason:'NOT_PUBLICLY_AVAILABLE_BY_DECLARED_DAY',publicAvailableFrom:s.publicAvailableFrom})),
    status: findings.length?'SOURCE_BOUND_RECONSTRUCTION':'NO_ADMISSIBLE_CASE_SPECIFIC_DOCUMENTS',
    hasPublicIncidentSpecificClaims:findings.some(f=>f.sourceId!=='SEC-RLP-67347'),
    hasInternal2012Logs:false,
    prospectivePredictionValidated:false,
    observedReturnMinted:false,
    actorKnowledgeFromPublicDate:'UNKNOWN_UNLESS_SEPARATE_CONTEMPORANEOUS_RECEIPT',
    warnings:['OFFICIAL_DOCUMENTARY_REPORT_NOT_DIRECT_SFI_OBSERVATION','SOURCE_PUBLICATION_DATE_NOT_ACTOR_KNOWLEDGE',
      'NOT_A_CAUSAL_TEST','NOT_CONFIRMATORY_MIHM_T_EXPERIMENT'],
  };
}

export function summaryOfCase(d){
  validateOfficialDossier(d);
  const views=d.temporalCuts.map(c=>({id:c.id,purpose:c.purpose,...sourceViewAsOf(d,c.asOfLocal)}));
  return {
    contract:'SFI-MIHMT-REAL_CASE_RECONSTRUCTION_DIAGNOSTIC-1.0',
    caseId:d.caseId,
    dataClass:d.dataClass,
    mode:'REAL_DOCUMENTARY_RETROSPECTION_NOT_PROSPECTIVE_PREDICTION',
    sourceCount:d.officialSources.length,
    documentedFindingCount:d.documentedFindings.length,
    dimensionalReadingCount:d.dimensionalReadings.length,
    relationCount:d.relationships.length,
    temporalViews:views.map(v=>({
      id:v.id,asOfLocal:v.asOfLocal,sourceIds:v.sources.map(s=>s.id),
      includedFindingIds:v.findings.map(f=>f.id),quantityIds:v.documentedQuantities.map(q=>q.id),
      relationIds:v.relations.map(q=>q.id),hasPublicIncidentSpecificClaims:v.hasPublicIncidentSpecificClaims,
      excludedSourceIds:v.excludedSources.map(s=>s.id),status:v.status
    })),
    verificationStatus:'DOCUMENTED_OFFICIAL_HISTORICAL_SOURCE_DOSSIER',
    empiricalPerformance:'NOT_EVALUATED',
    realityChainEligible:false,
    canonicalEvidenceAdmitted:false,
    limitations:[
      'Later SEC investigation cannot be treated as 2012 pre-incident publicly knowable detail.',
      'Regulator findings were entered in an administrative settlement without respondent admitting or denying facts, except SEC jurisdiction.',
      'Contemporaneous internal monitoring and authorization receipts are not in this dossier.',
      'No retrospective numerical mechanism is calibrated or compared against a competent conventional M0.',
    ],
  };
}

export function loadOfficialDossier() {
  const url=new URL('../../../docs/research/cases/SFI-MIHMT-KNIGHT-2012-OFFICIAL-DOSSIER.json',import.meta.url);
  return validateOfficialDossier(JSON.parse(readFileSync(url,'utf8')));
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(summaryOfCase(loadOfficialDossier()),null,2)+'\n');
}
