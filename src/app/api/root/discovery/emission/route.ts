import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';
import { persistDiscoveryEmissionReceipt } from '@/lib/discovery/discoveryEmitterRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = await requireRootActor('root.discovery.emit');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectKey = typeof body.objectKey === 'string' ? body.objectKey.trim() : '';
  if (!objectKey) return NextResponse.json({ ok: false, error: 'object_key_required' }, { status: 400 });
  try {
    const emission = await persistDiscoveryEmissionReceipt(objectKey, gate.ctx.user.id);
    return NextResponse.json({
      ok: true,
      emission,
      boundaries: {
        canonicalMutation: false,
        automaticPublication: false,
        externalNotification: false,
        indexNowRequiresConfiguredGovernedExecution: true,
      },
    }, { status: emission.replay ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('NOT_PUBLICABLE') ? 409 : 503;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
