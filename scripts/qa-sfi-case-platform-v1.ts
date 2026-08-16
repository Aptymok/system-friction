import assert from 'node:assert/strict';

import { createSfiCaseV1, validateSfiCaseV1 } from '../src/core/case-platform/caseEngine';
import { assembleSfiReportV1 } from '../src/core/case-platform/reportAssembler';

const cutoff = '2026-08-16T00:00:00.000Z';
const temporalWindow = {
  mode: 'LONGITUDINAL' as const,
  basis: 'OBSERVED_TIME' as const,
  start: null,
  end: null,
  cutoff,
  timezone: 'America/Mexico_City',
};

const cases = [
  ['SYSTEM_OBSERVATORY', 'SYSTEM'],
  ['AI_IMPLEMENTATION_DIAGNOSTIC', 'AI_SYSTEM'],
  ['AI_ADOPTION_INTEGRATION', 'ORGANIZATION'],
  ['AI_GOVERNANCE_ASSURANCE', 'AI_ASSISTED_DECISION_CHAIN'],
  ['SERVICE_OBSERVABILITY', 'HELP_DESK'],
  ['CONTRACT_WARRANTY_ASSURANCE', 'WARRANTY_ECOSYSTEM'],
  ['TENDER_ASSURANCE', 'TENDER'],
] as const;

for (const [serviceProfileId, subject] of cases) {
  const caseRecord = createSfiCaseV1({
    id: `qa-${serviceProfileId.toLowerCase()}`,
    tenantId: 'qa-tenant',
    serviceProfileId,
    subject,
    scope: 'synthetic architecture QA only',
    systemBoundaryRef: { id: `boundary-${serviceProfileId.toLowerCase()}` },
    temporalWindow,
    sourceRefs: [{ id: `source-${serviceProfileId.toLowerCase()}` }],
    createdAt: cutoff,
  });

  assert.deepEqual(validateSfiCaseV1(caseRecord), [], `${serviceProfileId}:shared_case_engine_validation_failed`);
  assert.equal(caseRecord.governance.rootAddressable, false, `${serviceProfileId}:case_root_addressable`);
  assert.equal(caseRecord.governance.institutionalAdmission, 'GATED', `${serviceProfileId}:case_admission_ungated`);
  assert.equal(caseRecord.lineage.sourceCutoff, cutoff, `${serviceProfileId}:source_cutoff_not_preserved`);

  const report = assembleSfiReportV1({
    id: `report-${caseRecord.id}`,
    caseRecord,
    generatedAt: cutoff,
    deliveryFormats: ['JSON', 'WEB'],
  });
  assert.equal(report.caseId, caseRecord.id, `${serviceProfileId}:report_case_identity_drift`);
  assert.equal(report.executionAuthority, false, `${serviceProfileId}:report_granted_execution_authority`);
  assert.deepEqual(report.deliveryFormats, ['JSON', 'WEB'], `${serviceProfileId}:report_delivery_drift`);
}

assert.throws(
  () => createSfiCaseV1({
    id: 'qa-invalid-tender',
    tenantId: 'qa-tenant',
    serviceProfileId: 'TENDER_ASSURANCE',
    subject: 'HELP_DESK',
    scope: 'must fail closed',
    systemBoundaryRef: { id: 'boundary-invalid' },
    temporalWindow,
    createdAt: cutoff,
  }),
  /SFI_CASE_SUBJECT_NOT_ACCEPTED/,
  'service_profile_subject_boundary_did_not_fail_closed',
);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CASE-1.0',
  sharedEngineProfilesExercised: cases.map(([id]) => id),
  persistenceAdded: false,
  databaseMigrationAdded: false,
  directRootAccess: false,
  reportExecutionAuthority: false,
}, null, 2));
