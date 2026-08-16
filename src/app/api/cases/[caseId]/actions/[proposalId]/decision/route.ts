import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { decideCaseActionProposal } from '@/lib/sfi/case-platform/actionRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ decision: z.enum(['APPROVE','REJECT']), rationale: z.string().trim().max(4000).nullable().optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string; proposalId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId, proposalId } = await context.params;
    const body = schema.parse(await request.json());
    const proposal = await decideCaseActionProposal({ caseId, proposalId, userId: user.id, decision: body.decision, rationale: body.rationale });
    return NextResponse.json({ ok: true, proposal, humanTenantAuthority: true, rootAddressed: false });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
