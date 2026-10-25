import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCaseProjectAssignment} from '../src/lib/sfi/case-platform/caseProjectAssignment';
import {computeCaseSourceReadiness, SFI_CASE_SOURCE_PROTOCOL_CONTRACT} from '../src/lib/sfi/case-platform/sourceProtocolReadiness';
import {projectCaseTemporalProvenance} from '../src/lib/sfi/case-platform/temporalProvenance';
import {projectCaseAuthorityEvidence} from '../src/lib/sfi/case-platform/authorityEvidenceReadModel';

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
assert.match(ui,/visibleDecisions\.length} PERSISTED AUTHORITY DECISIONS/);
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

console.log('PASS C03 CASE PLATFORM: project-tenant association, one case insert, scoped detail, web links and authority');
