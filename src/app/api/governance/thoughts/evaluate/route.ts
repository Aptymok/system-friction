import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { evaluateThoughtInhibition } from '@/lib/governance/thoughtInhibition';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const result = await evaluateThoughtInhibition({
    actorId: ctx.user.id,
    thoughtType: body?.thoughtType ?? 'UNKNOWN',
    evidenceCount: body?.evidenceCount ?? 0,
    evidenceTypes: Array.isArray(body?.evidenceTypes) ? body.evidenceTypes : [],
    reason: body?.reason,
    payload: body?.payload ?? {},
  });

  return NextResponse.json(result, {
    status: result.inhibited ? 423 : 200,
  });
}
