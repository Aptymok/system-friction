import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase, transitionOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const statusSchema = z.enum(['DRAFT','OPEN','OBSERVING','ANALYZING','AWAITING_GOVERNANCE','INTERVENING','AWAITING_RETURN','CLOSED','REJECTED']);
const patchSchema = z.object({ status: statusSchema }).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const envelope = await readOperationalCase(caseId, user.id);
    return NextResponse.json({ ok: true, ...envelope });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = patchSchema.parse(await request.json());
    const envelope = await transitionOperationalCase({ caseId, userId: user.id, status: body.status });
    return NextResponse.json({ ok: true, ...envelope });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
