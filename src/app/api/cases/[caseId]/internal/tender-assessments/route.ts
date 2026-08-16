import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSfiMember } from '@/lib/system/access/server';
import { normalizeTenderAssessment } from '@/core/case-platform';
import { recordOperationalCaseObject } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const refSchema = z.object({ id: z.string().trim().min(1).max(500), version: z.string().trim().max(120).nullable().optional(), hash: z.string().trim().max(256).nullable().optional() }).strict();
const entityRefSchema = refSchema.extend({ entityType: z.enum(['REQUIREMENT','BIDDER']) }).strict();
const schema = z.object({
  assessmentId: z.string().trim().min(1).max(240),
  requirementRef: entityRefSchema,
  bidderRef: entityRefSchema,
  result: z.enum(['PASS','FAIL','UNDETERMINED']),
  sourceRefs: z.array(refSchema).min(1).max(500),
  recordRefs: z.array(refSchema).max(500).optional(),
  evidenceRefs: z.array(refSchema).max(500).optional(),
  pageLocator: z.string().trim().max(240).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  missingReason: z.string().trim().max(2000).nullable().optional(),
  contradictionRefs: z.array(refSchema).max(500).optional(),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireSfiMember();
    const { caseId } = await context.params;
    const body = schema.parse(await request.json());
    const assessment = normalizeTenderAssessment(body as Parameters<typeof normalizeTenderAssessment>[0]);
    const object = await recordOperationalCaseObject({ caseId, userId: user.id, ...assessment });
    return NextResponse.json({
      ok: true,
      assessment: object,
      winnerSelectionAuthority: false,
      humanDecisionAuthorityPreserved: true,
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
