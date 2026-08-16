import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { recordApprovedCaseIntervention } from '@/lib/sfi/case-platform/actionRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ observedAt: z.string().trim().min(1).max(80), executionDetails: z.record(z.string(), z.unknown()).optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string; proposalId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId, proposalId } = await context.params;
    const body = schema.parse(await request.json());
    const result = await recordApprovedCaseIntervention({ caseId, proposalId, userId: user.id, observedAt: body.observedAt, executionDetails: body.executionDetails });
    return NextResponse.json({ ok: true, ...result, platformPerformedExternalAction: false }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
