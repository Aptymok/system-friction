import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { listOperationalCaseObjects, recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({
  id: z.string().trim().min(1).max(500),
  version: z.string().trim().max(120).nullable().optional(),
  hash: z.string().trim().max(256).nullable().optional(),
}).strict();

const clientWriteSchema = z.object({
  kind: z.enum(['RECORD','OBSERVATION','RETURN']),
  canonicalRef: refSchema,
  sourceRefs: z.array(refSchema).max(500).optional(),
  recordRefs: z.array(refSchema).max(500).optional(),
  evidenceRefs: z.array(refSchema).max(500).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  observedAt: z.string().trim().max(80).nullable().optional(),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const objects = await listOperationalCaseObjects(caseId, user.id);
    return NextResponse.json({ ok: true, objects });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = clientWriteSchema.parse(await request.json());
    const object = await recordOperationalCaseObject({
      caseId,
      userId: user.id,
      kind: body.kind,
      epistemicRole: 'RECORD',
      canonicalRef: body.canonicalRef,
      sourceRefs: body.sourceRefs,
      recordRefs: body.recordRefs,
      evidenceRefs: body.evidenceRefs,
      payload: body.payload,
      observedAt: body.observedAt,
    });
    return NextResponse.json({
      ok: true,
      object,
      epistemicBoundary: 'Client-submitted records remain RECORD. This endpoint cannot create EVIDENCE, ANALYSIS, GOVERNANCE_DECISION or TRUTH_CLAIM objects.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
