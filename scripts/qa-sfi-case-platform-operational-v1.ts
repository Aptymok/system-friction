import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { assessSfiInstrumentAccess, createSfiCaseV1, normalizeSfiCaseSourceIntake, validateSfiCaseObjectDraft } from '../src/core/case-platform';

async function text(path:string){return readFile(path,'utf8');}
async function main(){
  const migration=await text('supabase/migrations/20260816124000_sfi_case_platform_operational_v1.sql');
  const repository=await text('src/lib/sfi/case-platform/repository.ts');
  const casesRoute=await text('src/app/api/cases/route.ts');
  const objectsRoute=await text('src/app/api/cases/[caseId]/objects/route.ts');
  const reportsRoute=await text('src/app/api/cases/[caseId]/reports/route.ts');
  const internalObjects=await text('src/app/api/cases/[caseId]/internal/objects/route.ts');
  for(const table of ['sfi_tenants','sfi_tenant_members','sfi_cases','sfi_case_objects','sfi_case_reports','sfi_case_audit_events'])assert(migration.includes(`public.${table}`),`missing operational table ${table}`);
  assert(migration.includes('sfi_tenant_can_read'));assert(migration.includes('sfi_tenant_can_write'));assert(migration.includes('execution_authority = false'));assert(migration.includes('rootAddressable'));assert(migration.includes('institutionalAdmission'));assert(migration.includes('No client-facing DELETE policies'));
  assert(!migration.includes('insert into public.sfi_evidence_ledger'));assert(!migration.includes('institutional_memory'));
  assert(!repository.includes("from('sfi_evidence_ledger')"));assert(!repository.includes("from('institutional_memory')"));assert(!repository.includes("from('root_"));
  assert(casesRoute.includes('requireAuthenticatedUser'));
  assert(objectsRoute.includes("z.enum(['RECORD','OBSERVATION'])"));assert(!objectsRoute.includes("'RETURN'"));assert(!objectsRoute.includes('evidenceRefs: z.array'));assert(objectsRoute.includes('cannot create EVIDENCE'));
  assert(reportsRoute.includes('requireAuthenticatedUser'),'tenant report endpoint must authenticate');
  assert(!reportsRoute.includes('requireSfiMember'),'tenant report generation must rely on tenant role, not institutional membership');
  assert(reportsRoute.includes('executionAuthority: false'),'report API must not expose action authority');
  assert(internalObjects.includes('requireSfiMember'),'evidence/analysis assessment remains internal');

  const caseRecord=createSfiCaseV1({id:'case-operational-qa',tenantId:'tenant-qa',serviceProfileId:'SERVICE_OBSERVABILITY',subject:'HELP_DESK',scope:'QA shared case engine',systemBoundaryRef:{id:'system:help-desk'},temporalWindow:{mode:'LONGITUDINAL',basis:'OBSERVED_TIME',start:'2026-08-01T00:00:00Z',end:null,cutoff:'2026-08-16T12:00:00Z',timezone:'America/Mexico_City'},createdAt:'2026-08-16T12:00:00Z'});
  const blocked=assessSfiInstrumentAccess({caseRecord,instrumentKind:'AI_MODEL',presentSourceTypes:['TICKETS']});assert.equal(blocked.allowed,false);assert.deepEqual(blocked.missingSources.sort(),['ASSETS','SLA_RECORDS'].sort());assert.equal(blocked.outputsBecomeEvidenceByInheritance,false);
  const allowed=assessSfiInstrumentAccess({caseRecord,instrumentKind:'AI_MODEL',presentSourceTypes:['TICKETS','ASSETS','SLA_RECORDS']});assert.equal(allowed.allowed,true);assert.equal(allowed.truthAuthority,false);assert.equal(allowed.executionAuthority,false);
  const source=normalizeSfiCaseSourceIntake({id:'tickets-2026-08',sourceType:'TICKETS',label:'Help desk tickets',externalRef:'private://tenant/tickets-2026-08',contentHash:'0123456789abcdef0123456789abcdef'});assert.equal(source.rawContentPersisted,false);assert.equal(source.sourceRef.hash,'0123456789abcdef0123456789abcdef');
  assert.deepEqual(validateSfiCaseObjectDraft({kind:'INSTRUMENT_RUN',epistemicRole:'EVIDENCE',canonicalRef:{id:'run:bad'}}),['CASE_DERIVED_OBJECT_AUTHORITY_FORBIDDEN:INSTRUMENT_RUN:EVIDENCE','CASE_INSTRUMENT_OUTPUT_ROLE_INVALID']);
  const evidenceViolations=validateSfiCaseObjectDraft({kind:'EVIDENCE',epistemicRole:'EVIDENCE',canonicalRef:{id:'evidence:no-lineage'}});assert(evidenceViolations.includes('CASE_EVIDENCE_REQUIRES_SOURCE_OR_RECORD_LINEAGE'));
  console.log(JSON.stringify({ok:true,contract:'SFI-CASE-PLATFORM-OPERATIONAL-1.0',tenantIsolation:true,clientRecordOnlyWrites:true,tenantReportGeneration:true,reportExecutionAuthority:false,institutionalMemoryDirectWrite:false,requiredSourceGate:true},null,2));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
