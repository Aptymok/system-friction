import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { listOperationalEnterpriseRelations, recordOperationalEnterpriseRelation } from '@/lib/sfi/case-platform/enterpriseRepository';
import { assertCaseReferenceIntegrity, assertTenantEnterpriseEntityRefs } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type { SfiEnterpriseRelationDraft } from '@/core/case-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const canonicalRefSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const entityTypeSchema = z.enum(['TENDER','REQUIREMENT','BIDDER','BID_SUBMISSION','SUPPLIER','CONTRACT','OBLIGATION','ASSET','SERVICE','TICKET','SLA','WARRANTY','WARRANTY_EVENT','RETURN','SUPPLIER_PERFORMANCE']);
const entityRefSchema = canonicalRefSchema.extend({ entityType: entityTypeSchema }).strict();
const relationTypeSchema = z.enum(['TENDER_HAS_REQUIREMENT','BIDDER_PARTICIPATES_IN_TENDER','BID_SUBMISSION_FOR_TENDER','BID_SUBMISSION_BY_BIDDER','BIDDER_MAPS_TO_SUPPLIER','TENDER_AWARDS_SUPPLIER','CONTRACT_ARISES_FROM_TENDER','CONTRACT_BINDS_SUPPLIER','CONTRACT_DEFINES_OBLIGATION','CONTRACT_COVERS_ASSET','CONTRACT_COVERS_SERVICE','ASSET_PROVIDED_BY_SUPPLIER','SERVICE_PROVIDED_BY_SUPPLIER','TICKET_AFFECTS_ASSET','TICKET_AFFECTS_SERVICE','TICKET_SUBJECT_TO_SLA','TICKET_ASSIGNED_TO_SUPPLIER','SLA_DERIVED_FROM_CONTRACT','WARRANTY_DEFINED_BY_CONTRACT','WARRANTY_COVERS_ASSET','WARRANTY_EVENT_AFFECTS_ASSET','WARRANTY_EVENT_UNDER_WARRANTY','WARRANTY_EVENT_ASSIGNED_TO_SUPPLIER','TICKET_TRIGGERS_WARRANTY_EVENT','RETURN_RESOLVES_WARRANTY_EVENT','RETURN_CLOSES_TICKET','SUPPLIER_PERFORMANCE_AGGREGATES_RETURN','SUPPLIER_PERFORMANCE_INFORMS_TENDER']);
const relationSchema = z.object({ relationKey: z.string().trim().min(1).max(500), relationType: relationTypeSchema, from: entityRefSchema, to: entityRefSchema, sourceRefs: z.array(canonicalRefSchema).max(500).optional(), recordRefs: z.array(canonicalRefSchema).max(500).optional(), payload: z.record(z.string(), z.unknown()).optional(), observedAt: z.string().trim().max(80).nullable().optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try { const { user } = await requireAuthenticatedUser(); const { caseId } = await context.params; return NextResponse.json({ ok: true, contract: 'SFI-ENTERPRISE-ASSURANCE-DOMAIN-1.0', relations: await listOperationalEnterpriseRelations(caseId, user.id) }); } catch (error) { return sfiCaseApiFailure(error); }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = relationSchema.parse(await request.json());
    await assertCaseReferenceIntegrity({ caseId, userId: user.id, sourceRefs: body.sourceRefs, recordRefs: body.recordRefs });
    await assertTenantEnterpriseEntityRefs({ caseId, userId: user.id, entityRefs: [body.from, body.to] });
    const relation: SfiEnterpriseRelationDraft = { ...body, evidenceRefs: [], epistemicRole: 'RECORD' } as SfiEnterpriseRelationDraft;
    const saved = await recordOperationalEnterpriseRelation({ caseId, userId: user.id, relation });
    return NextResponse.json({ ok: true, relation: saved, epistemicBoundary: 'Client-declared relations remain RECORD; endpoints and lineage refs must resolve, and this endpoint cannot create inferred relations or attach evidence claims.' }, { status: 201 });
  } catch (error) { return sfiCaseApiFailure(error); }
}
