import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  buildSupplierPerformanceAssessment,
  enterpriseEntityRef,
  normalizeServiceTicketRecord,
  normalizeTenderAssessment,
  normalizeTenderRequirementRecord,
  normalizeWarrantyEventRecord,
  validateEnterpriseRelationDraft,
} from '../src/core/case-platform';
import { OPERATIONAL_DELETE_ORDER } from './db/sfi-operational-reset-inventory.mjs';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const migration = read('supabase/migrations/20260816132000_sfi_enterprise_assurance_graph_v1.sql');
const clientRelations = read('src/app/api/cases/[caseId]/relations/route.ts');
const internalObjects = read('src/app/api/cases/[caseId]/internal/objects/route.ts');
const tenderRoute = read('src/app/api/cases/[caseId]/internal/tender-assessments/route.ts');
const intakeRoute = read('src/app/api/cases/[caseId]/enterprise/intake/route.ts');

assert(migration.includes('public.sfi_case_relations'));
assert(migration.includes('sfi_tenant_can_read'));
assert(migration.includes('sfi_tenant_can_write'));
assert(!migration.includes('sfi_evidence_ledger'));
assert(!migration.includes('institutional_memory'));
assert(!migration.includes('root_'));
assert(OPERATIONAL_DELETE_ORDER.includes('sfi_case_relations'), 'enterprise relation runtime must be in terminal reset inventory');
assert(/epistemicRole\s*:\s*['"]RECORD['"]/.test(clientRelations), 'client relation writes must remain RECORD');
assert(clientRelations.includes('cannot create inferred relations'));
assert(internalObjects.includes('requireSfiMember'));
assert(!internalObjects.includes("'GOVERNANCE_DECISION'"), 'internal generic object API must not bypass governance');
assert(!internalObjects.includes("'INTERVENTION'"), 'internal generic object API must not bypass action gate');
assert(tenderRoute.includes('requireSfiMember'));
assert(/winnerSelectionAuthority\s*:\s*false/.test(tenderRoute), 'tender route must explicitly deny winner selection authority');
assert(/does not infer cause/i.test(intakeRoute), 'enterprise intake must explicitly deny automatic causal inference');

const tender = enterpriseEntityRef('TENDER', 'T-001');
const requirement = normalizeTenderRequirementRecord({
  requirementId: 'R-001',
  tenderRef: tender,
  requirementText: 'Equipo con evidencia documental verificable.',
  frozenAt: '2026-08-16T12:00:00Z',
  sourceRefs: [{ id: 'source:tender' }],
  pageLocator: 'p. 12',
});
assert.equal(requirement.object.epistemicRole, 'RECORD');
assert.equal(requirement.relations[0]?.relationType, 'TENDER_HAS_REQUIREMENT');

const ticket = normalizeServiceTicketRecord({
  ticketId: 'TK-1',
  openedAt: '2026-08-16T12:00:00Z',
  status: 'OPEN',
  assetRef: enterpriseEntityRef('ASSET', 'A-1'),
  slaRef: enterpriseEntityRef('SLA', 'SLA-1'),
  sourceRefs: [{ id: 'source:tickets' }],
});
const ticketRelations = ticket.relations.map((item) => item.relationType);
assert.equal(ticket.object.payload.problemIdentityClaimed, false);
assert(ticketRelations.includes('TICKET_AFFECTS_ASSET'), `ticket relations missing asset edge: ${JSON.stringify(ticket.relations)}`);
assert(ticketRelations.includes('TICKET_SUBJECT_TO_SLA'), `ticket relations missing SLA edge: ${JSON.stringify(ticket.relations)}`);

const warranty = normalizeWarrantyEventRecord({
  eventId: 'W-1',
  occurredAt: '2026-08-16T12:00:00Z',
  eventType: 'CLAIM_OPENED',
  status: 'OPEN',
  assetRef: enterpriseEntityRef('ASSET', 'A-1'),
  supplierRef: enterpriseEntityRef('SUPPLIER', 'S-1'),
});
assert.equal(warranty.object.payload.contractualBreachDeclared, false);

assert.throws(() => normalizeTenderAssessment({
  assessmentId: 'A-bad',
  requirementRef: enterpriseEntityRef('REQUIREMENT', 'R-001'),
  bidderRef: enterpriseEntityRef('BIDDER', 'B-001'),
  result: 'PASS',
  sourceRefs: [{ id: 'source:bidder' }],
  evidenceRefs: [],
}), /REQUIRES_PAGE_AND_EVIDENCE/);

const undetermined = normalizeTenderAssessment({
  assessmentId: 'A-undetermined',
  requirementRef: enterpriseEntityRef('REQUIREMENT', 'R-001'),
  bidderRef: enterpriseEntityRef('BIDDER', 'B-001'),
  result: 'UNDETERMINED',
  sourceRefs: [{ id: 'source:bidder' }],
  evidenceRefs: [],
  missingReason: 'Required technical specification is absent from the supplied package.',
});
assert.equal(undetermined.payload.winnerSelectionAuthority, false);
assert.equal(undetermined.payload.determinability, 'UNDETERMINED');

const badRelation = validateEnterpriseRelationDraft({
  relationKey: 'bad',
  relationType: 'TICKET_AFFECTS_ASSET',
  epistemicRole: 'RECORD',
  from: enterpriseEntityRef('SUPPLIER', 'S-1'),
  to: enterpriseEntityRef('ASSET', 'A-1'),
});
assert(badRelation.includes('ENTERPRISE_RELATION_FROM_TYPE_MISMATCH:TICKET'));

const inferredWithoutEvidence = validateEnterpriseRelationDraft({
  relationKey: 'inferred-bad',
  relationType: 'SUPPLIER_PERFORMANCE_INFORMS_TENDER',
  epistemicRole: 'INFERENCE',
  from: enterpriseEntityRef('SUPPLIER_PERFORMANCE', 'SP-1'),
  to: tender,
});
assert(inferredWithoutEvidence.includes('ENTERPRISE_INFERRED_RELATION_REQUIRES_EVIDENCE'));

const supplierPerformance = buildSupplierPerformanceAssessment({
  assessmentId: 'SP-1',
  supplierRef: enterpriseEntityRef('SUPPLIER', 'S-1'),
  evidenceRefs: [{ id: 'evidence:service-history' }],
  recordRefs: [{ id: 'record:return-1' }],
  metrics: { slaComplianceRate: 0.92, warrantyResolutionRate: 0.84 },
});
assert.equal(supplierPerformance.payload.compositeScore, null);
assert.equal(supplierPerformance.payload.futureTenderDecisionAuthority, false);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ENTERPRISE-ASSURANCE-DOMAIN-1.0',
  chain: 'TENDER→SUPPLIER→CONTRACT→ASSET/SERVICE→TICKET/SLA→WARRANTY→RETURN→SUPPLIER_PERFORMANCE→NEXT_TENDER',
  clientRelations: 'RECORD_ONLY',
  tenderWinnerAuthority: false,
  automaticBreachDeclaration: false,
  automaticSupplierRanking: false,
  tenantGraphEqualsInstitutionalGraph: false,
}, null, 2));
