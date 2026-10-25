import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCaseProjectAssignment} from '../src/lib/sfi/case-platform/caseProjectAssignment';
import {computeCaseSourceReadiness, SFI_CASE_SOURCE_PROTOCOL_CONTRACT} from '../src/lib/sfi/case-platform/sourceProtocolReadiness';
import {projectCaseTemporalProvenance} from '../src/lib/sfi/case-platform/temporalProvenance';
import {projectCaseAuthorityEvidence} from '../src/lib/sfi/case-platform/authorityEvidenceReadModel';
import {projectCaseTrajectoryContrast} from '../src/lib/sfi/case-platform/trajectoryContrastReadModel';
import {projectCaseReturnLearning} from '../src/lib/sfi/case-platform/returnLearningReadModel';
import {describePassportReadBoundary} from '../src/lib/sfi/case-platform/passportReadBoundary';
import {preflightCaseSnapshotParity} from '../src/lib/persistence/caseSnapshotParityPreflight';

const project={id:'project-1',tenantId:'tenant-B',status:'ACTIVE'};
assert.deepEqual(resolveCaseProjectAssignment(null,null,null),{tenantId:null,projectId:null});
assert.deepEqual(resolveCaseProjectAssignment('tenant-A',null,null),{tenantId:'tenant-A',projectId:null});
assert.deepEqual(resolveCaseProjectAssignment(null,'project-1',project),{tenantId:'tenant-B',projectId:'project-1'});
assert.deepEqual(resolveCaseProjectAssignment('tenant-B','project-1',project),{tenantId:'tenant-B',projectId:'project-1'});
assert.throws(()=>resolveCaseProjectAssignment('tenant-A','project-1',project),/SFI_PROJECT_TENANT_MISMATCH/);
assert.throws(()=>resolveCaseProjectAssignment(null,'project-1',null),/SFI_PROJECT_NOT_FOUND/);
assert.throws(()=>resolveCaseProjectAssignment(null,'project-1',{...project,id:'other'}),/SFI_PROJECT_NOT_FOUND/);
assert.throws(()=>resolveCaseProjectAssignment(null,'project-1',{...project,status:'CLOSED'}),/SFI_PROJECT_NOT_ACTIVE/);

const read=(p:string)=>readFileSync(p,'utf8');
const repo=read('src/lib/sfi/case-platform/repository.ts');
const api=read('src/app/api/cases/route.ts');
const detail=read('src/app/api/cases/[caseId]/route.ts');
const ui=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(repo,/projectId: nullableText\(row\.project_id\)/);
assert.match(repo,/\.eq\('tenant_id', tenantId\)\.eq\('status', 'ACTIVE'\)/);
assert.match(repo,/project_id: projectId/);
assert.ok(repo.indexOf('project_id: projectId') < repo.indexOf("action: 'CASE_CREATED'"));
assert.match(api,/tenantId:assignment\.tenantId,projectId:assignment\.projectId/);
assert.doesNotMatch(api,/\.from\('sfi_cases'\)\.update\(\{project_id:/);
assert.match(api,/caseCount:cases\.filter\(item=>item\.projectId===String\(row\.id\)\)\.length/);
assert.doesNotMatch(api,/const caseLinks=/);
assert.match(detail,/projectFor\(state\.project_id, base\.caseRecord\.tenantId\)/);
assert.match(ui,/query\.get\('caseId'\)\?\?query\.get\('case'\)/);
assert.match(ui,/query\.get\('projectId'\)/);
assert.match(ui,/caseData\?\.authorityEvidence \? caseData\.authorityEvidence\.counts\.authorityDecisions/);
assert.doesNotMatch(ui,/visibleDecisions\.length} PERSISTED AUTHORITY DECISIONS/);
assert.match(ui,/realityChain\?\.authority\.filter/);
const externalCases = read('src/app/api/external/v1/cases/route.ts');
// Case read/Passport must declare stale continuity without mutating, implying
// full inventory, or smuggling SOURCE / RETURN across the data plane.
assert.match(externalCases, /async function caseReadConsistency\(\)/);
assert.match(externalCases, /state\.mode !== 'PRIMARY'/);
assert.match(externalCases, /readPlane: 'NEON_CONTINUITY'/);
assert.match(externalCases, /sourceInventoryComplete: false/);
assert.match(externalCases, /CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES/);
assert.match(externalCases, /readConsistency: await caseReadConsistency\(\)/);
assert.match(externalCases, /Cache-Control': 'private, no-store'/);

const sourceCutoff='2026-10-23';
const kxtxrProtocol={kind:'RECORD',canonicalRef:{id:'KXTXR-SOURCE-PROTOCOL-20261024'},
  payload:{contract:SFI_CASE_SOURCE_PROTOCOL_CONTRACT,caseCutoff:sourceCutoff,
    observationMode:'READ_ONLY',question:'Which releases are independently verified?',
    requiredSourceTypes:['AUTHORED_DOCUMENT','PUBLIC_PROVIDER_CATALOG']}};
const realSources=[
  {kind:'SOURCE',payload:{sourceType:'AUTHORED_DOCUMENT'}},
  {kind:'SOURCE',payload:{sourceType:'PUBLIC_PROVIDER_CATALOG'}},
];
const declared=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],
  [kxtxrProtocol,...realSources],sourceCutoff);
assert.equal(declared.protocolStatus,'DECLARED');
assert.equal(declared.sourceCoverage,1);
assert.equal(declared.readyForAnalysis,true);
assert.deepEqual(declared.missingSources,[]);
assert.equal(declared.sourceProtocolRef,'KXTXR-SOURCE-PROTOCOL-20261024');
// Documentary readiness does not imply accepted evidence or institutional authority.
assert.equal(declared.boundary,'SOURCE_TYPES_PRESENT_NOT_ACCEPTED_EVIDENCE_OR_ROOT_AUTHORITY');
const missingProtocol=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],realSources,sourceCutoff);
assert.equal(missingProtocol.readyForAnalysis,false);
assert.equal(missingProtocol.protocolStatus,'DECLARATION_MISSING');
const conflicting=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],
  [kxtxrProtocol,kxtxrProtocol,...realSources],sourceCutoff);
assert.equal(conflicting.readyForAnalysis,false);
assert.equal(conflicting.protocolStatus,'DECLARATION_CONFLICT');
const cutoffDrift=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],
  [{...kxtxrProtocol,payload:{...kxtxrProtocol.payload,caseCutoff:'2026-10-25'}},...realSources],sourceCutoff);
assert.equal(cutoffDrift.readyForAnalysis,false);
assert.equal(cutoffDrift.protocolStatus,'DECLARATION_INVALID');
const syntheticSentinel=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],
  [{...kxtxrProtocol,payload:{...kxtxrProtocol.payload,requiredSourceTypes:['AUTHORED_DOCUMENT','DECLARED_BY_PROTOCOL']}},...realSources],sourceCutoff);
assert.equal(syntheticSentinel.readyForAnalysis,false);
assert.equal(syntheticSentinel.protocolStatus,'DECLARATION_INVALID');
const oneSource=computeCaseSourceReadiness(['DECLARED_BY_PROTOCOL'],
  [kxtxrProtocol,realSources[0]],sourceCutoff);
assert.equal(oneSource.readyForAnalysis,false);
assert.deepEqual(oneSource.missingSources,['PUBLIC_PROVIDER_CATALOG']);
assert.equal(oneSource.sourceCoverage,0.5);


const multiClockObjects=[
  {kind:'SOURCE',createdAt:'2026-10-25T01:30:00Z',
    canonicalRef:{id:'document-declaration'},payload:{
      sourceType:'AUTHORED_DOCUMENT',label:'KXTXR authored songs',
      metadata:{fileCreatedAt:'2026-09-04T10:21:49Z',
        fileModifiedAt:'2026-09-07T04:01:31Z'}}},
  {kind:'SOURCE',createdAt:'2026-10-25T01:36:00Z',
    canonicalRef:{id:'catalog-source'},payload:{
      sourceType:'PUBLIC_PROVIDER_CATALOG',
      metadata:{supplier:'Apple Music',providerDisplayedReleaseDate:'2026-08-25'}}},
  {kind:'OBSERVATION',createdAt:'2026-10-25T01:37:00Z',observedAt:null,
    canonicalRef:{id:'catalog-observation'},payload:{
      provider:'Amazon Music',providerDisplayedReleaseDate:'2026-10-03',
      sourceUrl:'https://example.test/should-not-be-reexported'}}
];
const clocks=projectCaseTemporalProvenance(multiClockObjects,sourceCutoff);
assert.equal(clocks.snapshotObjectCount,3);
assert.equal(clocks.totalFacts,7);
assert.equal(clocks.events.filter(e=>e.clock==='DOCUMENT_CREATED').length,1);
assert.equal(clocks.events.filter(e=>e.clock==='DOCUMENT_MODIFIED').length,1);
assert.equal(clocks.events.filter(e=>e.clock==='PROVIDER_DISPLAYED_RELEASE').length,2);
assert.equal(clocks.events.filter(e=>e.clock==='CASE_OBJECT_PERSISTED').length,3);
assert.ok(clocks.events.filter(e=>e.clock==='CASE_OBJECT_PERSISTED')
  .every(e=>e.relationToCutoff==='AFTER_CUTOFF'));
assert.ok(clocks.events.filter(e=>e.clock==='PROVIDER_DISPLAYED_RELEASE')
  .every(e=>e.interpretation==='PROVIDER_CLAIM'
    && e.historicalStatus==='NO_RETROSPECTIVE_VERIFICATION'));
assert.ok(clocks.events.every(e=>!JSON.stringify(e).includes('example.test')));
assert.ok(!clocks.events.some(e=>e.clock==='OBSERVATION_RECORDED'));
assert.ok(clocks.events.filter(e=>e.precision==='DAY').every(e=>!e.value.includes('T')));
const capped=projectCaseTemporalProvenance(multiClockObjects,sourceCutoff,2);
assert.equal(capped.totalFacts,7);
assert.equal(capped.events.length,2);
assert.equal(capped.truncated,true);
const invalid=projectCaseTemporalProvenance([{kind:'SOURCE',createdAt:'2026-10-25T01:37:00Z',
  canonicalRef:{id:'invalid-source'},payload:{sourceType:'AUTHORED_DOCUMENT',
    metadata:{fileCreatedAt:'2026-13-99'}}}],sourceCutoff);
assert.equal(invalid.skippedInvalid,1);
assert.equal(invalid.totalFacts,1);
const c14Repository=read('src/lib/sfi/case-platform/repository.ts');
assert.match(c14Repository,/temporalProvenance: projectCaseTemporalProvenance\(objects, caseRecord\.temporalWindow\.cutoff\)/);
assert.match(externalCases,/temporalProvenance:envelope\.temporalProvenance/);

const c14Ui=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(c14Ui,/data-c14-temporal-source-clocks/);
assert.match(c14Ui,/caseData\.temporalProvenance\.events/);
assert.match(c14Ui,/temporalProvenance:caseData\.temporalProvenance/);
assert.match(c14Ui,/FECHA DE CONTEXTO · NO PRUEBA RETROSPECTIVA/);


const chainFixture={
  caseId:'KXTXR-TEST',
  provenance:{adjudications:[
    {evidenceRef:{id:'evidence-1'},state:'PENDING',
      sourceRoots:['authored-doc-1'],assessmentRefs:[]},
    {evidenceRef:{id:'evidence-2'},state:'ACCEPTED',
      sourceRoots:['provider-1'],assessmentRefs:[{id:'assessment-1'}]},
    {evidenceRef:{id:'evidence-3'},state:'REJECTED',
      sourceRoots:[],assessmentRefs:[{id:'assessment-2'}]},
  ]},
  authority:[
    {id:'decision-1',proposalId:'proposal-1',decision:'ACCEPT',authorityRole:'ROOT',
      decidedBy:'actor-1',createdAt:'2026-10-24T20:00:00Z'},
    {id:'decision-2',proposalId:'proposal-2',decision:'DENY',authorityRole:'',
      decidedBy:'',createdAt:'2026-10-24T21:00:00Z'},
  ],
  executions:[{verified:false},{verified:true}],
  gaps:['READ_INCOMPLETE','EVIDENCE_ASSESSMENT_MISSING','UNRESOLVED_REFERENCE:missing'],
} as unknown as Parameters<typeof projectCaseAuthorityEvidence>[0];
const assurance=projectCaseAuthorityEvidence(chainFixture);
assert.equal(assurance.counts.evidenceItems,3);
assert.equal(assurance.counts.accepted,1);
assert.equal(assurance.counts.rejected,1);
assert.equal(assurance.counts.pending,1);
assert.equal(assurance.counts.authorityDecisions,2);
assert.equal(assurance.counts.authorityRecordsComplete,1);
assert.equal(assurance.counts.executionRecords,2);
assert.equal(assurance.counts.verifiedExecutions,1);
assert.equal(assurance.snapshotIntegrity,'LIMITED_BY_READ_OR_PROVENANCE');
assert.equal(assurance.integrityGaps.length,2);
assert.equal(assurance.evidence[0].state,'PENDING');
assert.deepEqual(assurance.evidence[1].rootSources,['provider-1']);
assert.equal(assurance.evidence[1].meaning,'CHAIN_ADJUDICATION_ACCEPTED_ONLY');
assert.equal(assurance.authority[0].meaning,'CASE_DECISION_RECORD_NOT_UNIVERSAL_EXECUTION_PERMISSION');
assert.equal(assurance.authority[1].recordIntegrity,'FIELDS_INCOMPLETE');
assert.equal(projectCaseAuthorityEvidence(chainFixture,1).truncated,true);
assert.equal(projectCaseAuthorityEvidence(chainFixture,1).evidence.length,1);
assert.equal(projectCaseAuthorityEvidence(chainFixture,1).authority.length,1);
assert.equal(projectCaseAuthorityEvidence({caseId:'EMPTY',provenance:{adjudications:[]},
  authority:[],executions:[],gaps:['READ_INCOMPLETE']} as unknown as Parameters<typeof projectCaseAuthorityEvidence>[0]).snapshotIntegrity,
  'LIMITED_BY_READ_OR_PROVENANCE');
const authorityRepo=read('src/lib/sfi/case-platform/repository.ts');
assert.match(authorityRepo,/authorityEvidence: projectCaseAuthorityEvidence\(realityChain\)/);
assert.match(externalCases,/authorityEvidence:envelope\.authorityEvidence/);
const authorityUi=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(authorityUi,/data-c15-c16-authority-evidence-ledger/);
assert.match(authorityUi,/caseData\.authorityEvidence\.counts\.accepted/);
assert.match(authorityUi,/caseData\.authorityEvidence\.counts\.authorityDecisions/);
assert.match(authorityUi,/authorityEvidence:caseData\.authorityEvidence/);
assert.doesNotMatch(authorityUi,/\.length} ADMITTED EVIDENCE/);


const c17Case={id:'KXTXR-TEST',subject:'KXTXR',scope:'Test declared objective',
  temporalWindow:{start:'2026-02-01',end:null,cutoff:'2026-10-23',horizon:null}};
const c17Unknown=projectCaseTrajectoryContrast(c17Case,[],
  {provenance:{adjudications:[]},executions:[],gaps:['READ_INCOMPLETE']});
assert.equal(c17Unknown.attainment,'NOT_ESTABLISHED');
assert.equal(c17Unknown.contrast,'NOT_CALIBRATED');
assert.equal(c17Unknown.counts.attractors,0);
assert.equal(c17Unknown.counts.caseReturns,0);
assert.equal(c17Unknown.readScope,'PROVIDER_OR_PROVENANCE_INCOMPLETE');
assert.ok(c17Unknown.gaps.includes('NO_CASE_ATTRACTOR_REGISTERED_IN_SNAPSHOT'));
assert.ok(c17Unknown.gaps.includes('CURRENT_PROVIDER_READ_OR_PROVENANCE_INCOMPLETE'));
assert.equal(c17Unknown.clock.t1ObservedAndValidated,false);
const c17Objects=[
 {kind:'ATTRACTOR',canonicalRef:{id:'attractor-1'},payload:{goal:'Reach sustainable adoption'},
    createdAt:'2026-09-05T12:00:00Z'},
 {kind:'TRAJECTORY',canonicalRef:{id:'trajectory-1'},payload:{direction:'Release songs in sequence'},
    createdAt:'2026-09-10T12:00:00Z'},
 {kind:'OBSERVATION',canonicalRef:{id:'obs-1'},payload:{sourceType:'PUBLIC_PROVIDER_CATALOG'},
    observedAt:'2026-10-24T09:00:00Z',createdAt:'2026-10-24T09:01:00Z'},
 {kind:'OBSERVATION',canonicalRef:{id:'obs-undated'},payload:{sourceType:'PUBLIC_PROVIDER_CATALOG'},
    observedAt:'not a timestamp',createdAt:'2026-10-24T09:02:00Z'},
 {kind:'RETURN',canonicalRef:{id:'return-1'},payload:{status:'recorded'},
    createdAt:'2026-10-24T09:03:00Z'},
 {kind:'CONTRADICTION',canonicalRef:{id:'contradiction-1'},payload:{status:'unresolved'},
    createdAt:'2026-10-24T09:04:00Z'},
];
const c17Present=projectCaseTrajectoryContrast(c17Case,c17Objects,
  {provenance:{adjudications:[{state:'ACCEPTED'},{state:'PENDING'}]},
    executions:[{verified:true},{verified:false}],gaps:[]});
assert.equal(c17Present.counts.attractors,1);
assert.equal(c17Present.counts.trajectories,1);
assert.equal(c17Present.counts.caseObservations,2);
assert.equal(c17Present.counts.datedCaseObservations,1);
assert.equal(c17Present.counts.chainAcceptedEvidence,1);
assert.equal(c17Present.counts.caseReturns,1);
assert.equal(c17Present.counts.verifiedExecutionRecords,1);
assert.equal(c17Present.counts.caseContradictions,1);
assert.equal(c17Present.attractors[0].status,'DECLARED_ATTRACTOR_NOT_PROOF_OF_CONVERGENCE');
assert.equal(c17Present.trajectories[0].status,'RECORDED_TRAJECTORY_NOT_OBSERVED_EFFECT');
assert.equal(c17Present.latestObservations.length,1);
assert.equal(c17Present.attainment,'NOT_ESTABLISHED');
assert.equal(c17Present.contrast,'NOT_CALIBRATED');
assert.equal(c17Present.clock.t1ObservedAndValidated,false);
assert.equal(c17Present.gaps.length,0);
const c17Limited=projectCaseTrajectoryContrast(c17Case,c17Objects,
  {provenance:{adjudications:[]},executions:[],gaps:[]},1);
assert.equal(c17Limited.latestObservations.length,1);
assert.equal(c17Limited.counts.caseObservations,2);
assert.ok(c17Limited.gaps.includes('NO_ACCEPTED_CHAIN_EVIDENCE_IN_SNAPSHOT'));
const c17Repo=read('src/lib/sfi/case-platform/repository.ts');
assert.match(c17Repo,/trajectoryContrast: projectCaseTrajectoryContrast\(caseRecord, objects, realityChain\)/);
assert.match(externalCases,/trajectoryContrast:envelope\.trajectoryContrast/);
const c17Ui=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(c17Ui,/data-c17-trajectory-contrast/);
assert.match(c17Ui,/caseData\.trajectoryContrast\.attainment/);
assert.match(c17Ui,/trajectoryContrast:caseData\.trajectoryContrast/);
assert.doesNotMatch(c17Ui,/caseData\.trajectoryContrast\.attainment==='ACHIEVED'/);

const internalCaseDetail=read('src/app/api/cases/[caseId]/route.ts');
assert.match(internalCaseDetail,/readDataPlaneState\(\)/);
assert.match(internalCaseDetail,/CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES/);
assert.match(internalCaseDetail,/readConsistency: consistency/);
assert.match(internalCaseDetail,/Cache-Control': 'private, no-store'/);
const continuityUi=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(continuityUi,/data-case-continuity-warning/);
assert.match(continuityUi,/caseData\?\.readConsistency\?\.warning/);
assert.match(continuityUi,/Un cero en esta vista no es ausencia histórica/);


const c18Chain={
  caseId:'case-c18-test',
  executions:[{ref:{id:'exec-a'},verified:true},{ref:{id:'exec-b'},verified:false}],
  returns:[
    {ref:{id:'return-contradicted'},executionRef:{id:'exec-a'},verified:true,
      contrast:'CONTRADICTED',expected:{metric:'streams',expected:500,tolerance:20,
      sensitiveNotes:'NOT_FOR_READ_MODEL'},observed:180},
    {ref:{id:'return-supported'},executionRef:{id:'exec-a'},verified:true,
      contrast:'SUPPORTED',expected:{metric:'plays',expected:30,tolerance:2},observed:31},
    {ref:{id:'return-unverified'},executionRef:{id:'exec-b'},verified:true,
      contrast:'CONTRADICTED',expected:{metric:'views',expected:7,tolerance:0},observed:2},
    {ref:{id:'return-uncomparable'},executionRef:{id:'exec-a'},verified:true,
      contrast:'NOT_COMPARABLE',expected:{metric:'unknown'},observed:null},
  ],gaps:[],interpreter:{mode:'DETERMINISTIC_TRANSLATION'},
  closure:{certified:false}
} as unknown as Parameters<typeof projectCaseReturnLearning>[0];
const c18=projectCaseReturnLearning(c18Chain);
assert.equal(c18.counts.recordedReturns,4);
assert.equal(c18.counts.contradictedCandidates,1);
assert.equal(c18.counts.supportedExpectations,1);
assert.equal(c18.counts.unverifiedReturns,1);
assert.equal(c18.counts.nonComparable,1);
assert.equal(c18.records[0].state,'CONTRADICTED_CANDIDATE_FOR_REVIEW');
assert.equal(c18.records[0].learningCandidate,'REQUIRES_INDEPENDENT_CONTRAST_AND_ROOT_GOVERNANCE');
assert.equal(c18.records[0].promotedToCanon,false);
assert.equal(c18.records[0].promotedToLearning,false);
assert.equal(c18.records[0].causalEffectEstablished,false);
assert.equal(c18.learningStatus,'NO_GOVERNED_LEARNING_PROMOTION_OBSERVED');
assert.ok(c18.records.every(x=>!JSON.stringify(x).includes('NOT_FOR_READ_MODEL')));
assert.equal(projectCaseReturnLearning(c18Chain,1).truncated,true);
const c18Limited=projectCaseReturnLearning({...c18Chain,gaps:['READ_INCOMPLETE']});
assert.equal(c18Limited.readScope,'PROVIDER_OR_PROVENANCE_INCOMPLETE');
const c18None=projectCaseReturnLearning({...c18Chain,returns:[]});
assert.equal(c18None.counts.recordedReturns,0);
assert.equal(c18None.counts.contradictedCandidates,0);
assert.equal(c18None.learningStatus,'NO_GOVERNED_LEARNING_PROMOTION_OBSERVED');
const c18Repo=read('src/lib/sfi/case-platform/repository.ts');
assert.match(c18Repo,/returnLearning: projectCaseReturnLearning\(realityChain\)/);
assert.match(externalCases,/returnLearning:envelope\.returnLearning/);
const c18Ui=read('src/components/sfi/RealityChainWorkbench.tsx');
assert.match(c18Ui,/data-c18-return-learning-review/);
assert.match(c18Ui,/caseData\.returnLearning\.counts\.contradictedCandidates/);
assert.match(c18Ui,/returnLearning:caseData\.returnLearning/);
assert.match(c18Ui,/Causalidad acreditada: NO\. Promoción institucional: NO/);


const snap=(ref:string)=>({
  canonicalRefId:ref,rowId:'row:'+ref,objectKind:'SOURCE',
  payloadDigest:'digest:'+ref,canonicalVersion:null as string|null,
});
const both=['ref-common-1','ref-common-2','ref-conflict-1','ref-conflict-2'];
const primaryOnly=Array.from({length:11},(_,i)=>'primary-'+i);
const neonOnly=Array.from({length:6},(_,i)=>'neon-'+i);
const primarySnap=[...both,...primaryOnly].map(snap);
const neonSnap=[...both,...neonOnly].map(ref=>{
  const row=snap(ref);
  return ref.startsWith('ref-conflict-')
    ?{...row,rowId:'different:'+ref,payloadDigest:'new:'+ref}:row;
});
const fork=preflightCaseSnapshotParity(primarySnap,neonSnap);
assert.equal(fork.counts.primary,15);
assert.equal(fork.counts.continuity,10);
assert.equal(fork.counts.exactMatches,2);
assert.equal(fork.counts.conflictingRefs,2);
assert.equal(fork.counts.primaryOnly,11);
assert.equal(fork.counts.continuityOnly,6);
assert.equal(fork.parityVerified,false);
assert.equal(fork.permitsMirrorDrain,false);
assert.equal(fork.permitsAuthorityReplay,false);
assert.equal(fork.permitsSourcePromotion,false);
assert.equal(fork.sharedConflicts[0].reasons.includes('ROW_ID_MISMATCH'),true);
assert.equal(fork.sharedConflicts[0].reasons.includes('CONTENT_DIGEST_MISMATCH'),true);
const matched=preflightCaseSnapshotParity([snap('one')],[snap('one')]);
assert.equal(matched.parityVerified,true);
assert.equal(matched.permitsMirrorDrain,false); // parity does not confer permission
assert.equal(preflightCaseSnapshotParity([],[]).parityVerified,false);
const duplicate=preflightCaseSnapshotParity([snap('one'),snap('one')],[snap('one')]);
assert.equal(duplicate.parityVerified,false);
assert.deepEqual(duplicate.duplicate.primary,['one']);
const invalidRef=preflightCaseSnapshotParity([{...snap('one'),payloadDigest:''}],[snap('one')]);
assert.equal(invalidRef.parityVerified,false);
assert.deepEqual(invalidRef.invalid.primary,['one']);


const c19Primary=describePassportReadBoundary('PRIMARY');
assert.equal(c19Primary.readPlane,'SUPABASE_PRIMARY');
assert.equal(c19Primary.crossProviderParity,'NOT_VERIFIED');
assert.equal(c19Primary.sourceInventoryComplete,false);
assert.equal(c19Primary.warning,'PRIMARY_SNAPSHOT_NOT_CROSS_PROVIDER_CERTIFIED');
const c19Continuity=describePassportReadBoundary('CONTINUITY');
assert.equal(c19Continuity.readPlane,'NEON_CONTINUITY');
assert.equal(c19Continuity.dataPlaneMode,'CONTINUITY');
assert.equal(c19Continuity.sourceInventoryComplete,false);
assert.equal(c19Continuity.warning,'CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES_OR_DIVERGE');
assert.match(c19Continuity.humanWarning,/Puede omitir escrituras de PRIMARY/);
const c19Recovery=describePassportReadBoundary('RECOVERY');
assert.equal(c19Recovery.dataPlaneMode,'RECOVERY');
assert.equal(c19Recovery.crossProviderParity,'NOT_VERIFIED');
const c19Unknown=describePassportReadBoundary(null);
assert.equal(c19Unknown.readPlane,'UNVERIFIED');
assert.equal(c19Unknown.sourceInventoryComplete,false);
assert.equal(c19Unknown.warning,'DATA_PLANE_STATE_UNAVAILABLE');
const c19RouteConsistency=read('src/app/api/cases/[caseId]/reports/route.ts');
assert.match(c19RouteConsistency,/const plane = await readDataPlaneState\(\)/);
assert.match(c19RouteConsistency,/buildRealityPassportPdfInput\(chain, readConsistency\)/);
assert.match(c19RouteConsistency,/renderSfiRealityPassportHtml\(chain, readConsistency\)/);
assert.match(c19RouteConsistency,/readConsistency,/);
assert.match(c19RouteConsistency,/describePassportReadBoundary\(null\)/);
const c19Html=read('src/core/case-platform/reportAssembler.ts');
assert.match(c19Html,/data-c19-read-consistency/);
assert.match(c19Html,/esc\(consistencyMessage\)/);
assert.match(c19Html,/CROSS_PROVIDER_PARITY_NOT_VERIFIED/);
const c19Pdf=read('src/lib/sfi/case-platform/privateCaseBriefContract.ts');
assert.match(c19Pdf,/buildRealityPassportPdfInput\(chain:SfiRealityChain, readConsistency\?/);
assert.match(c19Pdf,/readConsistency\?\.humanWarning/);
assert.match(c19Pdf,/PARIDAD ENTRE BASES NO CERTIFICADA/);

const c19ReadbackRoute=read('src/app/api/cases/[caseId]/reports/route.ts');
assert.match(c19ReadbackRoute,/const reportId = query.get\('reportId'\)/);
assert.match(c19ReadbackRoute,/z\.string\(\)\.uuid\(\)\.safeParse\(reportId\)/);
assert.match(c19ReadbackRoute,/await listOperationalReports\(caseId,user\.id\)/);
assert.match(c19ReadbackRoute,/available\.find\(item=>item\.id===reportId\)/);
assert.match(c19ReadbackRoute,/REPORT_NOT_FOUND_IN_AUTHORIZED_CASE/);
assert.match(c19ReadbackRoute,/o\.kind==='REPORT' && o\.canonicalRef\.id===reportId/);
assert.match(c19ReadbackRoute,/reportObjectLinkage:ref\?'PRESENT_IN_AUTHORIZED_READ':'NOT_VISIBLE_OR_NOT_RECORDED'/);
assert.match(c19ReadbackRoute,/certification:'NOT_ESTABLISHED_BY_READBACK'/);
assert.match(c19ReadbackRoute,/readConsistency:consistency/);
assert.match(c19ReadbackRoute,/Cache-Control':'private, no-store'/);
const c19PassportRoute=read('src/app/api/cases/[caseId]/reports/route.ts');
assert.match(c19PassportRoute,/temporalProvenance:envelope\.temporalProvenance/);
assert.match(c19PassportRoute,/authorityEvidence:envelope\.authorityEvidence/);
assert.match(c19PassportRoute,/trajectoryContrast:envelope\.trajectoryContrast/);
assert.match(c19PassportRoute,/returnLearning:envelope\.returnLearning/);
assert.match(c19PassportRoute,/readConsistency,/);
assert.match(read('src/lib/sfi/case-platform/passportReadBoundary.ts'),/CONTINUITY_SNAPSHOT_MAY_LAG_PRIMARY_WRITES_OR_DIVERGE/);
assert.match(read('src/lib/sfi/case-platform/passportReadBoundary.ts'),/DATA_PLANE_STATE_UNAVAILABLE/);
assert.match(c19PassportRoute,/Cache-Control':'private, no-store'/);
assert.match(c19PassportRoute,/X-Content-Type-Options':'nosniff'/);
// The JSON export is a readable projection, not a license to change the
// canonical report or produce observational RETURN from documentary closure.
assert.doesNotMatch(c19PassportRoute,/promotedToLearning: true/);

console.log('PASS C03 CASE PLATFORM: project-tenant association, one case insert, scoped detail, web links and authority');
