import fs from 'node:fs';
import assert from 'node:assert/strict';
import { assertSfiCaseActionTransition, canSfiCaseActionTransition, SFI_CASE_ACTION_BOUNDARY } from '../src/core/case-platform';
import { OPERATIONAL_DELETE_ORDER } from './db/sfi-operational-reset-inventory.mjs';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260816140000_sfi_case_governed_action_v1.sql');
const integrity = read('src/lib/sfi/case-platform/integrity.ts');
const actionRepo = read('src/lib/sfi/case-platform/actionRepository.ts');
const objectsRoute = read('src/app/api/cases/[caseId]/objects/route.ts');
const internalObjects = read('src/app/api/cases/[caseId]/internal/objects/route.ts');
const reportsRoute = read('src/app/api/cases/[caseId]/reports/route.ts');
const tenderRoute = read('src/app/api/cases/[caseId]/internal/tender-assessments/route.ts');
const relationRoute = read('src/app/api/cases/[caseId]/relations/route.ts');
const internalRelationRoute = read('src/app/api/cases/[caseId]/internal/relations/route.ts');

assert(migration.includes('public.sfi_case_action_proposals'));
assert(migration.includes('public.sfi_case_action_decisions'));
assert(migration.includes("authority_role in ('OWNER','ADMIN')"));
assert(migration.includes('authenticated clients receive no direct INSERT/UPDATE policy'));
assert(migration.includes('Decision rows are server-generated'));
assert(!migration.includes('create policy sfi_case_action_proposals_tenant_insert'));
assert(!migration.includes('create policy sfi_case_action_decisions_tenant_insert'));
assert(migration.includes("object_kind in ('RECORD','OBSERVATION')"));
assert(migration.includes('Report creation is server/institutional only'));
assert(migration.includes('Audit events are server-generated only'));
assert(migration.includes('No ROOT foreign key'));
assert(migration.includes('No automatic execution trigger'));
assert(!migration.includes('root_'));
assert(OPERATIONAL_DELETE_ORDER.includes('sfi_case_action_decisions'));
assert(OPERATIONAL_DELETE_ORDER.includes('sfi_case_action_proposals'));

assert.equal(SFI_CASE_ACTION_BOUNDARY.reportHasExecutionAuthority, false);
assert.equal(SFI_CASE_ACTION_BOUNDARY.automaticExternalExecution, false);
assert.equal(SFI_CASE_ACTION_BOUNDARY.clientAddressesRoot, false);
assert(canSfiCaseActionTransition('PENDING', 'APPROVED'));
assert(canSfiCaseActionTransition('APPROVED', 'EXECUTED'));
assert(canSfiCaseActionTransition('EXECUTED', 'RETURN_RECORDED'));
assert(!canSfiCaseActionTransition('PENDING', 'EXECUTED'));
assert.throws(() => assertSfiCaseActionTransition('REJECTED', 'EXECUTED'), /TRANSITION_FORBIDDEN/);

assert(integrity.includes('SFI_CASE_REFERENCE_NOT_FOUND'));
assert(integrity.includes('SFI_TENDER_REQUIREMENT_NOT_FROZEN'));
assert(integrity.includes('SFI_ENTERPRISE_ENTITY_REFERENCE_NOT_FOUND'));
assert(actionRepo.includes("['OWNER','ADMIN'].includes(authority.role)"));
assert(actionRepo.includes('platformPerformedExternalAction: false'));
assert(actionRepo.includes('causalEffectClaimed: false'));
assert(actionRepo.includes("kind: 'INTERVENTION'"));
assert(actionRepo.includes("kind: 'RETURN'"));
assert(!objectsRoute.includes("z.enum(['RECORD','OBSERVATION','RETURN'])"));
assert(!objectsRoute.includes('evidenceRefs: z.array'));
assert(internalObjects.includes('assertCaseReferenceIntegrity'));
assert(reportsRoute.includes('assertReportClaimsIntegrity'));
assert(tenderRoute.includes('assertTenderAssessmentPrerequisites'));
assert(relationRoute.includes('assertTenantEnterpriseEntityRefs'));
assert(internalRelationRoute.includes('assertTenantEnterpriseEntityRefs'));

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-CASE-ACTION-1.0',
  referenceIntegrity:true,
  databaseDirectWriteHardening:true,
  actionMutationsServerGoverned:true,
  reportExecutionAuthority:false,
  approvalAuthority:['OWNER','ADMIN'],
  directPendingToExecuted:false,
  externalExecutionPerformedByPlatform:false,
  returnRequiresIntervention:true,
  clientDirectReturnWrite:false,
},null,2));