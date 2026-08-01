import { NextResponse } from 'next/server';
import { CanonicalPipelineRunner } from '@/core/runtime/pipeline';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const runner = new CanonicalPipelineRunner();
  const result = await runner.run({
    capabilityId: typeof body.capabilityId === 'string' ? body.capabilityId : 'CAPABILITY_CANONICAL_PIPELINE',
    actorId: typeof body.actorId === 'string' ? body.actorId : 'SYSTEM',
    payload: body.payload ?? body,
  });

  return NextResponse.json({
    ok: true,
    route: '/api/sfi/execution',
    result,
  });
}
