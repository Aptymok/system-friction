import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
  buildAiAdoptionOpportunityAssessment,
  buildAiGovernanceTraceAssessment,
  buildAiImplementationFailureAssessment,
  buildSystemFrictionAssessment,
  normalizeAiDecisionTrace,
  normalizeAiExecutionTrace,
  normalizeSystemAiEntityRecord,
  normalizeSystemFailureEvent,
  systemAiEntityRef,
  validateSystemAiRelationDraft,
} from '../src/core/case-platform';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260816145000_sfi_system_ai_assurance_domain_v1.sql');
const atomicMigration=read('supabase/migrations/20260816145500_sfi_system_ai_atomic_intake_v1.sql');
const guardMigration=read('supabase/migrations/20260816145600_sfi_system_ai_intake_guards_v1.sql');
const intake=read('src/app/api/cases/[caseId]/system-ai/intake/route.ts');
const assessments=read('src/app/api/cases/[caseId]/internal/system-ai/assessments/route.ts');
const readModel=read('src/lib/sfi/case-platform/systemAiReadModel.ts');
const systemAiRepository=read('src/lib/sfi/case-platform/systemAiRepository.ts');
const integrity=read('src/lib/sfi/case-platform/integrity.ts');
const enterpriseRepository=read('src/lib/sfi/case-platform/enterpriseRepository.ts');
const enterpriseIntake=read('src/app/api/cases/[caseId]/enterprise/intake/route.ts');
const tenderRoute=read('src/app/api/cases/[caseId]/internal/tender-assessments/route.ts');

assert(migration.includes('alter table public.sfi_case_relations'));
assert(!migration.includes('create table'));
assert(migration.includes('TENDER_HAS_REQUIREMENT'),'enterprise relation contract must survive extension');
assert(migration.includes('AI_EXECUTION_USES_MODEL'));
assert(migration.includes('FAILURE_EVENT_ASSOCIATED_WITH_AI_EXECUTION'));
assert(migration.includes('drop policy if exists sfi_case_relations_tenant_insert'));
assert(!migration.includes('create policy sfi_case_relations_tenant_insert'),'authenticated direct relation inserts must be disabled; validated API/RPC paths are authoritative');
assert(migration.includes('no direct authenticated insert path') || migration.includes('There is no direct authenticated insert path'));
assert(!migration.includes('sfi_evidence_ledger'));
assert(!migration.includes('institutional_memory'));
assert(!migration.includes('root_'));

assert(atomicMigration.includes('sfi_record_system_ai_intake_package_v1'));
assert(atomicMigration.includes('sfi_record_system_ai_relation_v1'));
assert(atomicMigration.includes('security definer'));
assert(atomicMigration.includes('Validate every relation and every endpoint before the first write.'));
assert(atomicMigration.includes("'SYSTEM_AI_INTAKE_PACKAGE_RECORDED'"));
assert(atomicMigration.includes("'SYSTEM_AI_RELATION_RECORDED'"));
assert(atomicMigration.includes('v_existing_relation.from_ref is distinct from v_from'),'packet retry must compare full from ref');
assert(atomicMigration.includes('v_existing_relation.to_ref is distinct from v_to'),'packet retry must compare full to ref');
assert(atomicMigration.includes('v_existing.from_ref is distinct from v_from'),'standalone retry must compare full from ref');
assert(atomicMigration.includes("o.payload->>'contract' = 'SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0'"),'relation endpoints must resolve inside the System/AI domain');
assert(atomicMigration.includes('grant execute on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) to service_role'));
assert(atomicMigration.includes('revoke all on function public.sfi_record_system_ai_intake_package_v1(uuid,uuid,jsonb,jsonb) from authenticated'));
assert(atomicMigration.includes('grant execute on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) to service_role'));
assert(atomicMigration.includes('revoke all on function public.sfi_record_system_ai_relation_v1(uuid,uuid,jsonb) from authenticated'));

assert(guardMigration.includes('sfi_record_system_ai_intake_package_core_v1'),'guard migration must hide the raw package implementation behind a wrapper');
assert(guardMigration.includes('SFI_SYSTEM_AI_DUPLICATE_RELATION_KEY_IN_PACKAGE'),'duplicate relation keys must fail before persistence');
assert(guardMigration.includes('SFI_AI_EXECUTION_COMPLETION_REQUIRED'),'assurance intake must reject in-progress execution records');
assert(guardMigration.includes('SFI_AI_EXECUTION_FINISHED_BEFORE_STARTED'),'database intake must protect execution chronology');
assert(guardMigration.includes('revoke all on function public.sfi_record_system_ai_intake_package_core_v1(uuid,uuid,jsonb,jsonb) from service_role'),'service clients must not bypass package guards');
assert(/finishedAt:z\.string\(\)\.trim\(\)\.min\(1\)\.max\(80\)/.test(intake),'AI execution assurance intake must require finishedAt');
assert(!/finishedAt:z\.string\(\)\.trim\(\)\.max\(80\)\.nullable\(\)\.optional\(\)/.test(intake),'AI execution intake must not accept an in-progress trace');

assert(systemAiRepository.includes('persistOperationalSystemAiIntakePackage'));
assert(systemAiRepository.includes("service.rpc('sfi_record_system_ai_intake_package_v1'"));
assert(systemAiRepository.includes("service.rpc('sfi_record_system_ai_relation_v1'"),'standalone relations must persist through the transactional audited RPC');
assert(systemAiRepository.includes('materializeSystemAiEntityRefs'),'relation endpoints must be materialized to exact canonical revisions');
assert(systemAiRepository.includes('SFI_SYSTEM_AI_PACKAGE_RELATION_NOT_BOUND_TO_OBJECT'));
assert(!systemAiRepository.includes(".from('sfi_case_relations').insert"),'standalone System/AI relation writes must not bypass transactional auditing');
assert(intake.includes('persistOperationalSystemAiIntakePackage'));
assert(!intake.includes('recordOperationalCaseObject'));
assert(!intake.includes('recordOperationalSystemAiRelation'));
assert(intake.includes('assertCaseServiceProfileAllowed'));

assert(assessments.includes("['AI_IMPLEMENTATION_DIAGNOSTIC','CUSTOM_RESEARCH']"));
assert(assessments.includes("['AI_ADOPTION_INTEGRATION','CUSTOM_RESEARCH']"));
assert(assessments.includes("['AI_GOVERNANCE_ASSURANCE','CUSTOM_RESEARCH']"));
assert(assessments.includes('stageRecordRefs'));
assert(!assessments.includes('stagePresence:stagePresenceSchema'));

assert(readModel.includes('visualLayout:null'));
assert(readModel.includes('ranking:null'));
assert(readModel.includes('SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT'));
assert(readModel.includes('SYSTEM_AI_ASSESSMENT_TYPES'));
assert(readModel.includes('isSystemAiAssessmentPayload'));
assert(readModel.includes('isSystemAiEntityPayload'),'generic CUSTOM_RESEARCH objects must not enter System/AI nodes by entityType alone');
assert(readModel.includes("object.kind==='RECOMMENDATION'&&isSystemAiDomainPayload(object.payload)"),'action proposals must be scoped by a System/AI recommendation object');
assert(readModel.includes('const actions=allActions.filter'),'unrelated case action proposals must not leak into System/AI action state');
assert(integrity.includes('SFI_SYSTEM_AI_ENTITY_REFERENCE_NOT_FOUND'));
assert(integrity.includes('SFI_CASE_SERVICE_PROFILE_FORBIDDEN'));
assert(/domainContract\s*:\s*SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT/.test(integrity),'System/AI entity references must require domain identity');
assert(integrity.includes('expectedVersion'),'canonical reference integrity must validate a supplied version');
assert(/refVersion\(row\.canonical_ref\)\s*!==\s*expectedVersion/.test(integrity),'case refs with nonexistent revisions must fail closed');
assert(enterpriseRepository.includes(".in('relation_type', [...SFI_ENTERPRISE_RELATION_TYPES])"),'enterprise read model must not absorb system/AI relations');
assert(enterpriseRepository.includes('assertCaseServiceProfileAllowed'),'enterprise relation repository must be profile-routed');
assert(enterpriseIntake.includes("['SERVICE_OBSERVABILITY','ENTERPRISE_MEMORY','CUSTOM_RESEARCH']"),'ticket intake must route to service observability');
assert(enterpriseIntake.includes("['CONTRACT_WARRANTY_ASSURANCE','ENTERPRISE_MEMORY','CUSTOM_RESEARCH']"),'warranty intake must route to warranty assurance');
assert(enterpriseIntake.includes("['TENDER_ASSURANCE','ENTERPRISE_MEMORY','CUSTOM_RESEARCH']"),'tender requirement intake must route to tender assurance');
assert(tenderRoute.includes("['TENDER_ASSURANCE','CUSTOM_RESEARCH']"),'tender assessments must be tender-routed');

const aiSystem=systemAiEntityRef('AI_SYSTEM','ai-1');
const model=systemAiEntityRef('AI_MODEL','m-1');
const entity=normalizeSystemAiEntityRecord({entityType:'AI_SYSTEM',entityId:'ai-1',label:'AI 1'});
assert.equal(entity.object.payload.contract,SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT);
const execution=normalizeAiExecutionTrace({executionId:'x-1',aiSystemRef:aiSystem,modelRef:model,startedAt:'2026-08-16T12:00:00Z',finishedAt:'2026-08-16T12:00:05Z',status:'DONE',inputHash:'abc123',outputHash:'def456'});
assert.equal(execution.object.payload.contract,SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT);
assert.equal(execution.object.payload.rawPromptPersisted,false);
assert.equal(execution.object.payload.rawInputPersisted,false);
assert.equal(execution.object.payload.decisionAuthorityClaimed,false);
assert(execution.relations.some(r=>r.relationType==='AI_EXECUTION_USES_MODEL'));
assert.throws(()=>normalizeAiExecutionTrace({executionId:'x-impossible',aiSystemRef:aiSystem,modelRef:model,startedAt:'2026-08-16T12:00:05Z',finishedAt:'2026-08-16T12:00:04Z',status:'DONE'}),/FINISHED_BEFORE_STARTED/);
const failure=normalizeSystemFailureEvent({failureId:'f-1',occurredAt:'2026-08-16T12:01:00Z',failureType:'TIMEOUT',aiExecutionRef:systemAiEntityRef('AI_EXECUTION','x-1')});
assert.equal(failure.object.payload.contract,SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT);
assert.equal(failure.object.payload.causeClaimed,false);
const decision=normalizeAiDecisionTrace({decisionId:'d-1',decidedAt:'2026-08-16T12:02:00Z',disposition:'ESCALATE',aiExecutionRef:systemAiEntityRef('AI_EXECUTION','x-1')});
assert.equal(decision.object.payload.contract,SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT);
assert.equal(decision.object.payload.aiOutputEqualsDecision,false);
assert.throws(()=>buildSystemFrictionAssessment({assessmentId:'fr-0',locationRef:systemAiEntityRef('COMPONENT','c-1'),frictionType:'LATENCY',evidenceRefs:[]}),/REQUIRES_EVIDENCE/);
const friction=buildSystemFrictionAssessment({assessmentId:'fr-1',locationRef:systemAiEntityRef('COMPONENT','c-1'),frictionType:'LATENCY',evidenceRefs:[{id:'e:1'}],confidence:.7});
assert.equal(friction.payload.contract,SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT);
assert.equal(friction.payload.causalMechanismEstablished,false);
const aiFailure=buildAiImplementationFailureAssessment({assessmentId:'af-1',failureRef:systemAiEntityRef('FAILURE_EVENT','f-1'),layer:'INTEGRATION',evidenceRefs:[{id:'e:2'}],determinability:'PARTIALLY_DETERMINED'});
assert.equal(aiFailure.payload.rootCauseEstablished,false);
assert.equal(aiFailure.payload.modelBlameByDefault,false);
const opportunity=buildAiAdoptionOpportunityAssessment({assessmentId:'op-1',processRef:systemAiEntityRef('PROCESS','p-1'),useCaseRef:systemAiEntityRef('USE_CASE','u-1'),evidenceRefs:[{id:'e:3'}],projectedValue:.8,feasibility:.6,integrationRisk:.4});
assert.equal(opportunity.epistemicRole,'PROJECTION');
assert.equal(opportunity.payload.observedReturn,false);

const governance=buildAiGovernanceTraceAssessment({
  assessmentId:'g-1',
  stageRecordRefs:{
    MODEL:[{id:'r:model'}],PROMPT:[{id:'r:prompt'}],INPUT:[{id:'r:input'}],CONTEXT:[{id:'r:context'}],
    OUTPUT:[{id:'r:output'}],DECISION:[{id:'r:decision'}],HUMAN_AUTHORITY:[{id:'r:authority'}],
  },
  evidenceRefs:[{id:'e:4'}],
});
assert.deepEqual(governance.payload.missingStages,['ACTION','RETURN']);
assert.equal(governance.payload.auditReady,false);
assert.equal(governance.payload.complianceClaimed,false);
assert.equal(governance.recordRefs?.length,7);

const fullGovernance=buildAiGovernanceTraceAssessment({
  assessmentId:'g-2',
  stageRecordRefs:{
    MODEL:[{id:'r:model'}],PROMPT:[{id:'r:prompt'}],INPUT:[{id:'r:input'}],CONTEXT:[{id:'r:context'}],OUTPUT:[{id:'r:output'}],
    DECISION:[{id:'r:decision'}],HUMAN_AUTHORITY:[{id:'r:authority'}],ACTION:[{id:'r:action'}],RETURN:[{id:'r:return'}],
  },
  evidenceRefs:[{id:'e:5'}],
});
assert.deepEqual(fullGovernance.payload.missingStages,[]);
assert.equal(fullGovernance.payload.auditReady,true);
assert.equal(fullGovernance.recordRefs?.length,9);

const badRelation=validateSystemAiRelationDraft({relationKey:'bad',relationType:'AI_SYSTEM_USES_MODEL',epistemicRole:'RECORD',from:systemAiEntityRef('COMPONENT','c'),to:model});
assert(badRelation.includes('SYSTEM_AI_RELATION_FROM_TYPE_MISMATCH:AI_SYSTEM'));
const inferred=validateSystemAiRelationDraft({relationKey:'infer',relationType:'COMPONENT_DEPENDS_ON_COMPONENT',epistemicRole:'INFERENCE',from:systemAiEntityRef('COMPONENT','a'),to:systemAiEntityRef('COMPONENT','b')});
assert(inferred.includes('SYSTEM_AI_INFERRED_RELATION_REQUIRES_EVIDENCE'));

console.log(JSON.stringify({
  ok:true,
  contract:SFI_SYSTEM_AI_ASSURANCE_DOMAIN_CONTRACT,
  profiles:['SYSTEM_OBSERVATORY','AI_IMPLEMENTATION_DIAGNOSTIC','AI_ADOPTION_INTEGRATION','AI_GOVERNANCE_ASSURANCE'],
  sharedRelationStore:true,
  serviceProfileRouting:true,
  directAuthenticatedRelationWrites:'BLOCKED',
  atomicIntake:true,
  duplicateRelationKeysRejected:true,
  completedExecutionTraceRequired:true,
  atomicStandaloneRelations:true,
  exactRevisionRelationIdentity:true,
  canonicalReferenceVersionsValidated:true,
  auditedRelationWrites:true,
  domainScopedNodes:true,
  domainScopedActions:true,
  executionChronologyValidated:true,
  stagePresenceDerivedFromValidatedRecords:true,
  visualLayoutDefined:false,
  aiOutputDecisionAuthority:false,
  automaticRootCause:false,
  projectionObservedReturn:false,
  traceCompletenessCompliance:false,
},null,2));
