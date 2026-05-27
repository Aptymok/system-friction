import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { evaluateThoughtClosure } from '@/lib/cognitive/thoughtClosure';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await evaluateThoughtClosure({
    actorId: ctx.user.id,
    thoughtType: body?.thoughtType,
    claim: body?.claim,
    evidence: Array.isArray(body?.evidence) ? body.evidence : [],
    payload: body?.payload && typeof body.payload === 'object' ? body.payload : {},
  });

  return NextResponse.json(result, {
    status: result.ok ? 200 : 400,
  });
}
