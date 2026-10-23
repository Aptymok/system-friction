import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { recordCaseActionReturn } from '@/lib/sfi/case-platform/actionRepository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema=z.object({id:z.string().trim().min(1).max(500),version:z.string().trim().max(120).nullable().optional(),hash:z.string().trim().max(256).nullable().optional()}).strict();
const schema = z.object({ observedAt: z.string().trim().min(1).max(80), outcome: z.string().trim().min(1).max(8000), evidenceRefs:z.array(refSchema).max(500).optional(), measurements: z.record(z.string(), z.unknown()).optional() }).strict();
type RouteContext = { params: Promise<{ caseId: string; proposalId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId, proposalId } = await context.params;
    const body = schema.parse(await request.json());
    const result = await recordCaseActionReturn({ caseId, proposalId, userId: user.id, observedAt: body.observedAt, outcome: body.outcome, measurements: body.measurements, evidenceRefs:body.evidenceRefs });
    return NextResponse.json({ ok: true, ...result, causalEffectClaimed: false }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
