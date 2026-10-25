import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveCaseProjectAssignment} from '../src/lib/sfi/case-platform/caseProjectAssignment';
import {computeCaseSourceReadiness, SFI_CASE_SOURCE_PROTOCOL_CONTRACT} from '../src/lib/sfi/case-platform/sourceProtocolReadiness';

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

console.log('PASS C03 CASE PLATFORM: project-tenant association, one case insert, scoped detail, web links and authority');
