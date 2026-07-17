import { NextResponse } from 'next/server';
import { addEvidenceAndRecalibrate } from '@/lib/ppoi/ppoiService';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function failure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = details.includes('_REQUIRED') || details.includes('_INVALID') || details.includes('_NOT_ACTIVE')
    ? 400
    : details.includes('NOT_FOUND')
      ? 404
      : 500;
  return NextResponse.json({ ok: false, error: 'PPOI_EVIDENCE_FAILED', details }, { status });
}

export async function POST(request: Request, ctx: RouteContext) {
  try {
    const params = await Promise.resolve(ctx.params);
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const result = await addEvidenceAndRecalibrate(user.id, params.id, {
      evidenceType: typeof body.evidenceType === 'string' ? body.evidenceType : '',
      source: typeof body.source === 'string' ? body.source : '',
      domain: typeof body.domain === 'string' ? body.domain : '',
      contentUrl: typeof body.contentUrl === 'string' ? body.contentUrl : null,
      contentText: typeof body.contentText === 'string' ? body.contentText : null,
      generatesArtifact: Boolean(body.generatesArtifact),
      artifactNote: typeof body.artifactNote === 'string' ? body.artifactNote : null,
      observedAt: typeof body.observedAt === 'string' ? body.observedAt : null,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
