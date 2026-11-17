import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  // This endpoint exposes only operational readiness, never internal URLs or credentials.
  const url = process.env.SFI_ENGINE_URL;
  if (!url) return NextResponse.json({ ok: false, state: 'BLOCKED', reason: 'NO_PRIVATE_MIHM_BINDING' }, { status: 503 });
  try {
    const address = new URL('/health', url);
    const response = await fetch(address, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new Error('UNHEALTHY');
    const body = await response.json() as Record<string, unknown>;
    if (body.ok !== true || body.service !== 'sfi-engine') throw new Error('WRONG_SERVICE');
    return NextResponse.json({ ok: true, state: 'SERVICE_RESPONDING', method: 'MIHM_V3_CANONICAL_ACOUSTIC', scope: 'PYTHON_RUNTIME_HEALTH_ONLY' });
  } catch {
    return NextResponse.json({ ok: false, state: 'BLOCKED', reason: 'MIHM_SERVICE_UNREACHABLE' }, { status: 503 });
  }
}
