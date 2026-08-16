import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSfiMember } from '@/lib/system/access/server';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { assertCaseReferenceIntegrity } from '@/lib/sfi/case-platform/integrity';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import type { SfiCaseObjectKind } from '@/core/case-platform';
import type { SfiEpistemicClass } from '@/core/contracts/sfi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const schema = z.object({
  kind: z.enum(['RECORD','EVIDENCE','SYSTEM_MODEL','OBSERVATION','FRICTION','PERTURBATION','TRAJECTORY','ATTRACTOR','EPISTEMIC_ASSESSMENT','HYPOTHESIS','INSTRUMENT_RUN','ANALYSIS','RECOMMENDATION','UNRESOLVED_QUESTION','CONTRADICTION']),
  epistemicRole: z.enum(['RECORD','EVIDENCE','EPISTEMIC_ASSESSMENT','INFERENCE','SIMULATION','PROJECTION','COGNITIVE_EXECUTION']),
  canonicalRef: refSchema,
  sourceRefs: z.array(refSchema).max(500).optional(),
  recordRefs: z.array(refSchema).max(500).optional(),
  evidenceRefs: z.array(refSchema).max(500).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  observedAt: z.string().trim().max(80).nullable().optional(),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireSfiMember();
    const { caseId } = await context.params;
    const body = schema.parse(await request.json());
    await assertCaseReferenceIntegrity({ caseId, userId: user.id, sourceRefs: body.sourceRefs, recordRefs: body.recordRefs, evidenceRefs: body.evidenceRefs });
    const object = await recordOperationalCaseObject({
      caseId,
      userId: user.id,
      kind: body.kind as SfiCaseObjectKind,
      epistemicRole: body.epistemicRole as SfiEpistemicClass,
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
      boundary: 'Internal assessment can persist evidence/analysis only after referenced objects resolve with the claimed epistemic role. It cannot create governance decisions, interventions, truth claims, or institutional-memory writes.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
