import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { createCaseActionProposal, listCaseActionProposals } from '@/lib/sfi/case-platform/actionRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const proposalSchema = z.object({
  recommendationRef: refSchema,
  action: z.string().trim().min(1).max(8000),
  details: z.record(z.string(), z.unknown()).optional(),
  riskLevel: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
  reversibility: z.enum(['REVERSIBLE','PARTIALLY_REVERSIBLE','IRREVERSIBLE','UNKNOWN']),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    return NextResponse.json({ ok: true, actions: await listCaseActionProposals(caseId, user.id), executionAuthority: false });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = proposalSchema.parse(await request.json());
    const proposal = await createCaseActionProposal({ caseId, userId: user.id, ...body });
    return NextResponse.json({
      ok: true,
      proposal,
      status: 'PENDING',
      requiresTenantHumanAuthority: true,
      rootAddressed: false,
      boundary: 'Tenant OWNER/ADMIN/OPERATOR may propose. Approval remains OWNER/ADMIN. Proposal creation does not execute an external action or address institutional ROOT.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
