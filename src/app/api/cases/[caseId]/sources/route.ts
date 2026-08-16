import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { normalizeAndRegisterOperationalCaseSource } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const sourceSchema = z.object({
  sourceId: z.string().trim().min(1).max(240).optional(),
  sourceType: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(500),
  externalRef: z.string().trim().max(2000).nullable().optional(),
  observedAt: z.string().trim().max(80).nullable().optional(),
  contentHash: z.string().trim().min(16).max(256).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const body = sourceSchema.parse(await request.json());
    const source = await normalizeAndRegisterOperationalCaseSource({
      caseId,
      userId: user.id,
      source: {
        id: body.sourceId ?? randomUUID(),
        sourceType: body.sourceType,
        label: body.label,
        externalRef: body.externalRef,
        observedAt: body.observedAt,
        contentHash: body.contentHash,
        metadata: body.metadata,
      },
    });
    return NextResponse.json({ ok: true, source, epistemicBoundary: 'SOURCE ≠ RECORD ≠ EVIDENCE' }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
