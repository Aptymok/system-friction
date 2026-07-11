import { NextResponse } from 'next/server';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const gate = await requireRootActor('founder-state.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const state = await buildFounderConsoleState(request.url);

  if (!state.access.authenticated) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!state.access.authorized) {
    return NextResponse.json({ ok: false, error: 'root_required' }, { status: 403 });
  }

  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
