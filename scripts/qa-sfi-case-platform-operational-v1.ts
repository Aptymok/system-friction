import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import {
  assembleSfiReportV1,
  assessSfiInstrumentAccess,
  createSfiCaseV1,
  normalizeSfiCaseSourceIntake,
  validateSfiCaseObjectDraft,
} from '../src/core/case-platform';

async function text(path: string) {
  return readFile(path, 'utf8');
}

async function main() {
  const migration = await text('supabase/migrations/20260816124000_sfi_case_platform_operational_v1.sql');
  const repository = await text('src/lib/sfi/case-platform/repository.ts');
  const casesRoute = await text('src/app/api/cases/route.ts');
  const objectsRoute = await text('src/app/api/cases/[caseId]/objects/route.ts');
  const reportsRoute = await text('src/app/api/cases/[caseId]/reports/route.ts');
  const epistemicContract = await text('src/core/contracts/epistemic.ts');
  const reportContract = await text('src/core/contracts/report.ts');
  const reportAssembler = await text('src/core/case-platform/reportAssembler.ts');
  const reportIntegrity = await text('src/lib/sfi/case-platform/integrity.ts');
  const executionRecords = await text('src/lib/sfi/cognitive-runtime/executionRecords.ts');

  for (const table of ['sfi_tenants','sfi_tenant_members','sfi_cases','sfi_case_objects','sfi_case_reports','sfi_case_audit_events']) {
    assert(migration.includes(`public.${table}`), `missing operational table ${table}`);
  }
  assert(migration.includes('sfi_tenant_can_read'), 'tenant read isolation function missing');
  assert(migration.includes('sfi_tenant_can_write'), 'tenant write isolation function missing');
  assert(migration.includes("execution_authority = false"), 'report execution authority must be false at DB boundary');
  assert(migration.includes('rootAddressable'), 'case governance root boundary missing');
  assert(migration.includes('institutionalAdmission'), 'institutional admission boundary missing');
  assert(migration.includes('No client-facing DELETE policies'), 'client destructive delete boundary missing');
  assert(!migration.includes('insert into public.sfi_evidence_ledger'), 'commercial migration must not write institutional evidence ledger');
  assert(!migration.includes('institutional_memory'), 'commercial migration must not write institutional memory');

  assert(!repository.includes("from('sfi_evidence_ledger')"), 'case repository must not write/read institutional evidence ledger directly');
  assert(!repository.includes("from('institutional_memory')"), 'case repository must not address institutional memory directly');
  assert(!repository.includes("from('root_"), 'case repository must not address ROOT tables directly');
  assert(casesRoute.includes('requireAuthenticatedUser'), 'case API must authenticate');
  assert(objectsRoute.includes("z.enum(['RECORD','OBSERVATION'])"), 'client object endpoint must remain record-only');
  assert(!objectsRoute.includes("'RETURN'"), 'client object endpoint must not bypass governed return loop');
  assert(!objectsRoute.includes('evidenceRefs: z.array'), 'client object endpoint must not accept evidence claims');
  assert(objectsRoute.includes('cannot create EVIDENCE'), 'client epistemic boundary must be explicit');
  assert(reportsRoute.includes('requireSfiMember'), 'report generation must remain institutional in Operational V1');
  assert(reportsRoute.includes('executionAuthority: false'), 'report API must not expose action authority');

  // M4: output relation vocabulary belongs to the canonical epistemic contract and
  // report lineage is enforced by the existing Case Platform owner, not a second graph/writer.
  for (const relation of ['OBSERVATION','DERIVED','INFERENCE','HYPOTHESIS','PROJECTION','RECOMMENDATION','NOT_EXECUTED']) {
    assert(epistemicContract.includes(`'${relation}'`), `missing epistemic output relation ${relation}`);
  }
  assert(epistemicContract.includes('SFI_EPISTEMIC_OUTPUT_RELATIONS'), 'canonical epistemic output vocabulary missing');
  assert(reportContract.includes('SfiRenderedReportClaimLineageV1'), 'rendered claim lineage edge contract missing');
  assert(reportContract.includes('evidenceRefs: SfiCanonicalRef[]'), 'claim edge must preserve evidence refs');
  assert(reportContract.includes('confidence: number | null'), 'claim edge must preserve confidence');
  assert(reportsRoute.includes('lineageSchema'), 'report route must accept explicit execution lineage');
  assert(reportsRoute.includes('SFI_EPISTEMIC_OUTPUT_RELATIONS'), 'report route must reuse canonical output relation vocabulary');
  assert(reportsRoute.includes('assertReportClaimsIntegrity'), 'report route must enforce lineage integrity before persistence');
  assert(reportAssembler.includes('evidenceRefs: claim.evidenceRefs'), 'rendered claim edge must copy evidence refs from the claim');
  assert(reportAssembler.includes('confidence: claim.confidence'), 'rendered claim edge must copy confidence from the claim');
  assert(reportAssembler.includes("outputRelation: 'NOT_EXECUTED'"), 'claims without execution lineage must render NOT_EXECUTED');
  assert(reportAssembler.includes("'INSUFFICIENT' : 'UNSUPPORTED'"), 'unsupported claim rendering boundary missing');
  assert(reportIntegrity.includes('evidenceReachesClaimedSource'), 'report integrity must prove EVIDENCE to SOURCE lineage');
  assert(reportIntegrity.includes('readExecutionRecords'), 'report integrity must resolve the existing execution-record projection');
  assert(reportIntegrity.includes('SFI_REPORT_EXECUTION_NOT_OBSERVED_IN_BOUNDED_WINDOW'), 'bounded execution absence must remain NOT_OBSERVED');
  assert(reportIntegrity.includes('SFI_REPORT_EVIDENCE_SOURCE_LINEAGE_NOT_ESTABLISHED'), 'evidence/source lineage failure must be explicit');
  assert(reportIntegrity.includes('SFI_REPORT_CONTRADICTED_CLAIM_REQUIRES_CONTRADICTION'), 'contradicted claims must require contradiction refs');
  assert(executionRecords.includes('requestedOutputsObservation'), 'execution records must expose whether output classes were observed');
  assert(executionRecords.includes("hasObservedRequestedOutputs ? 'OBSERVED' : 'NOT_OBSERVED'"), 'unobserved output taxonomy must remain NOT_OBSERVED');

  const caseRecord = createSfiCaseV1({
    id: 'case-operational-qa',
    tenantId: 'tenant-qa',
    serviceProfileId: 'SERVICE_OBSERVABILITY',
    subject: 'HELP_DESK',
    scope: 'QA shared case engine',
    systemBoundaryRef: { id: 'system:help-desk' },
    temporalWindow: {
      mode: 'LONGITUDINAL',
      basis: 'OBSERVED_TIME',
      start: '2026-08-01T00:00:00Z',
      end: null,
      cutoff: '2026-08-16T12:00:00Z',
      timezone: 'America/Mexico_City',
    },
    createdAt: '2026-08-16T12:00:00Z',
  });

  const blockedInstrument = assessSfiInstrumentAccess({
    caseRecord,
    instrumentKind: 'AI_MODEL',
    presentSourceTypes: ['TICKETS'],
  });
  assert.equal(blockedInstrument.allowed, false);
  assert.deepEqual(blockedInstrument.missingSources.sort(), ['ASSETS','SLA_RECORDS'].sort());
  assert.equal(blockedInstrument.outputsBecomeEvidenceByInheritance, false);

  const allowedInstrument = assessSfiInstrumentAccess({
    caseRecord,
    instrumentKind: 'AI_MODEL',
    presentSourceTypes: ['TICKETS','ASSETS','SLA_RECORDS'],
  });
  assert.equal(allowedInstrument.allowed, true);
  assert.equal(allowedInstrument.truthAuthority, false);
  assert.equal(allowedInstrument.executionAuthority, false);

  const source = normalizeSfiCaseSourceIntake({
    id: 'tickets-2026-08',
    sourceType: 'TICKETS',
    label: 'Help desk tickets',
    externalRef: 'private://tenant/tickets-2026-08',
    contentHash: '0123456789abcdef0123456789abcdef',
  });
  assert.equal(source.rawContentPersisted, false);
  assert.equal(source.sourceRef.hash, '0123456789abcdef0123456789abcdef');

  assert.deepEqual(validateSfiCaseObjectDraft({
    kind: 'INSTRUMENT_RUN',
    epistemicRole: 'EVIDENCE',
    canonicalRef: { id: 'run:bad' },
  }), [
    'CASE_DERIVED_OBJECT_AUTHORITY_FORBIDDEN:INSTRUMENT_RUN:EVIDENCE',
    'CASE_INSTRUMENT_OUTPUT_ROLE_INVALID',
  ]);

  const evidenceViolations = validateSfiCaseObjectDraft({
    kind: 'EVIDENCE',
    epistemicRole: 'EVIDENCE',
    canonicalRef: { id: 'evidence:no-lineage' },
  });
  assert(evidenceViolations.includes('CASE_EVIDENCE_REQUIRES_SOURCE_OR_RECORD_LINEAGE'));

  const unsupportedReport = assembleSfiReportV1({
    id: 'report-m4-unsupported',
    caseRecord,
    generatedAt: '2026-09-03T00:30:00Z',
    claims: [{
      id: 'claim-no-execution',
      statement: 'A claim without observed execution lineage must remain insufficient.',
      assessmentRef: { id: 'assessment:qa' },
      evidenceRefs: [{ id: 'evidence:qa' }],
      recordRefs: [],
      sourceRefs: [{ id: 'source:qa' }],
      determinability: 'UNDETERMINED',
      confidence: null,
    }],
  });
  assert.equal(unsupportedReport.claims[0]?.lineage.executionRef, null);
  assert.equal(unsupportedReport.claims[0]?.lineage.outputRelation, 'NOT_EXECUTED');
  assert.equal(unsupportedReport.claims[0]?.lineage.support, 'INSUFFICIENT');
  assert.deepEqual(unsupportedReport.claims[0]?.lineage.evidenceRefs, [{ id: 'evidence:qa' }]);
  assert.equal(unsupportedReport.claims[0]?.lineage.confidence, null);
  assert(unsupportedReport.limitations.some((item) => item.includes('UNSUPPORTED or INSUFFICIENT')));

  const tracedReport = assembleSfiReportV1({
    id: 'report-m4-traced',
    caseRecord,
    generatedAt: '2026-09-03T00:31:00Z',
    claims: [{
      id: 'claim-traced',
      statement: 'A typed inference claim preserves edge evidence, contradiction, confidence and refutation conditions.',
      assessmentRef: { id: 'assessment:traced' },
      evidenceRefs: [{ id: 'evidence:traced' }],
      recordRefs: [{ id: 'record:traced' }],
      sourceRefs: [{ id: 'source:traced' }],
      determinability: 'PARTIALLY_DETERMINED',
      confidence: 0.64,
      lineage: {
        executionRef: { id: 'execution:traced' },
        outputRelation: 'INFERENCE',
        support: 'PARTIALLY_SUPPORTED',
        contradictionRefs: [{ id: 'contradiction:traced' }],
        refutationConditions: ['A stronger contradictory source would invalidate the claim.'],
      },
    }],
  });
  const tracedLineage = tracedReport.claims[0]?.lineage;
  assert.equal(tracedLineage?.outputRelation, 'INFERENCE');
  assert.deepEqual(tracedLineage?.evidenceRefs, [{ id: 'evidence:traced' }]);
  assert.deepEqual(tracedLineage?.contradictionRefs, [{ id: 'contradiction:traced' }]);
  assert.equal(tracedLineage?.confidence, 0.64);
  assert.deepEqual(tracedLineage?.refutationConditions, ['A stronger contradictory source would invalidate the claim.']);

  console.log(JSON.stringify({
    ok: true,
    contract: 'SFI-CASE-PLATFORM-OPERATIONAL-1.0',
    tenantIsolation: true,
    clientRecordOnlyWrites: true,
    clientDirectReturnWrite: false,
    reportExecutionAuthority: false,
    institutionalMemoryDirectWrite: false,
    requiredSourceGate: true,
    m4OutputRelationsTyped: true,
    m4UnsupportedClaimRendering: unsupportedReport.claims[0]?.lineage.support,
    m4EdgeEvidencePreserved: tracedLineage?.evidenceRefs.length === 1,
    m4EdgeConfidencePreserved: tracedLineage?.confidence === 0.64,
    m4NoNewPersistenceOwner: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});