import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { normalizeEnterpriseEntityRecord, normalizeServiceTicketRecord, normalizeTenderRequirementRecord, normalizeWarrantyEventRecord, type SfiEnterpriseIntakePackage } from '@/core/case-platform';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { recordOperationalEnterpriseRelation } from '@/lib/sfi/case-platform/enterpriseRepository';
import { assertCaseReferenceIntegrity, assertTenantEnterpriseEntityRefs } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';
const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const entityTypeSchema = z.enum(['TENDER','REQUIREMENT','BIDDER','BID_SUBMISSION','SUPPLIER','CONTRACT','OBLIGATION','ASSET','SERVICE','TICKET','SLA','WARRANTY','WARRANTY_EVENT','RETURN','SUPPLIER_PERFORMANCE']);
const entityRefSchema = refSchema.extend({ entityType: entityTypeSchema }).strict();
const entitySchema = z.object({ type: z.literal('ENTITY'), entityType: entityTypeSchema, entityId: z.string().trim().min(1).max(240), label: z.string().trim().max(500).nullable().optional(), attributes: z.record(z.string(), z.unknown()).optional(), observedAt: z.string().trim().max(80).nullable().optional(), sourceRefs: z.array(refSchema).max(500).optional() }).strict();
const ticketSchema = z.object({ type: z.literal('SERVICE_TICKET'), ticketId: z.string().trim().min(1).max(240), openedAt: z.string().trim().min(1).max(80), closedAt: z.string().trim().max(80).nullable().optional(), status: z.string().trim().min(1).max(120), category: z.string().trim().max(240).nullable().optional(), priority: z.string().trim().max(120).nullable().optional(), responseMinutes: z.number().nonnegative().nullable().optional(), resolutionMinutes: z.number().nonnegative().nullable().optional(), recurrenceKey: z.string().trim().max(240).nullable().optional(), assetRef: entityRefSchema.nullable().optional(), serviceRef: entityRefSchema.nullable().optional(), slaRef: entityRefSchema.nullable().optional(), supplierRef: entityRefSchema.nullable().optional(), sourceRefs: z.array(refSchema).max(500).optional() }).strict();
const warrantySchema = z.object({ type: z.literal('WARRANTY_EVENT'), eventId: z.string().trim().min(1).max(240), occurredAt: z.string().trim().min(1).max(80), eventType: z.string().trim().min(1).max(160), status: z.string().trim().min(1).max(120), assetRef: entityRefSchema, warrantyRef: entityRefSchema.nullable().optional(), supplierRef: entityRefSchema.nullable().optional(), responseDueAt: z.string().trim().max(80).nullable().optional(), resolvedAt: z.string().trim().max(80).nullable().optional(), sourceRefs: z.array(refSchema).max(500).optional() }).strict();
const tenderRequirementSchema = z.object({ type: z.literal('TENDER_REQUIREMENT'), requirementId: z.string().trim().min(1).max(240), tenderRef: entityRefSchema, requirementText: z.string().trim().min(1).max(12000), requirementType: z.string().trim().max(240).nullable().optional(), frozenAt: z.string().trim().min(1).max(80), sourceRefs: z.array(refSchema).min(1).max(500), pageLocator: z.string().trim().max(240).nullable().optional() }).strict();
const intakeSchema = z.discriminatedUnion('type', [entitySchema, ticketSchema, warrantySchema, tenderRequirementSchema]);
type RouteContext = { params: Promise<{ caseId: string }> };

async function persistPackage(caseId: string, userId: string, packet: SfiEnterpriseIntakePackage) {
  await assertCaseReferenceIntegrity({ caseId, userId, sourceRefs: packet.object.sourceRefs, recordRefs: packet.object.recordRefs, evidenceRefs: packet.object.evidenceRefs });
  const object = await recordOperationalCaseObject({ caseId, userId, ...packet.object });
  const relations = [];
  for (const relation of packet.relations) {
    await assertCaseReferenceIntegrity({ caseId, userId, sourceRefs: relation.sourceRefs, recordRefs: relation.recordRefs, evidenceRefs: relation.evidenceRefs });
    await assertTenantEnterpriseEntityRefs({ caseId, userId, entityRefs: [relation.from, relation.to] });
    relations.push(await recordOperationalEnterpriseRelation({ caseId, userId, relation }));
  }
  return { object, relations };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser(); const { caseId } = await context.params; const body = intakeSchema.parse(await request.json());
    let packet: SfiEnterpriseIntakePackage;
    if (body.type === 'ENTITY') packet = normalizeEnterpriseEntityRecord(body);
    else if (body.type === 'SERVICE_TICKET') packet = normalizeServiceTicketRecord(body);
    else if (body.type === 'WARRANTY_EVENT') packet = normalizeWarrantyEventRecord(body);
    else packet = normalizeTenderRequirementRecord(body);
    const result = await persistPackage(caseId, user.id, packet);
    return NextResponse.json({ ok: true, contract: packet.contract, ...result, boundary: 'Enterprise intake persists records and declared relations only after referenced lineage/entities resolve. It does not infer cause, contractual breach, tender winner, supplier rank, or SFI institutional truth.' }, { status: 201 });
  } catch (error) { return sfiCaseApiFailure(error); }
}
