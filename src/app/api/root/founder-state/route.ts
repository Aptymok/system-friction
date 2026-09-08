import { NextResponse } from 'next/server';
import { buildFounderConsoleState } from '@/lib/founder-console/readModel';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const gate = await requireRootActor('founder-state.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const state = await buildFounderConsoleState(request.url);
  const profileRole = typeof gate.ctx.profile?.role === 'string' ? gate.ctx.profile.role : null;

  const verifiedState = {
    ...state,
    access: {
      ...state.access,
      authenticated: true,
      authorized: true,
      userId: gate.ctx.user.id,
      email: gate.ctx.user.email ?? state.access.email ?? null,
      role: state.access.role ?? profileRole,
    },
  };

  return NextResponse.json(verifiedState, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
