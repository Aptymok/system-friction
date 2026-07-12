import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const gate = await requireRootActor('me.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const ctx = gate.ctx;

  return NextResponse.json({
    ok: true,
    data: {
      user: { id: ctx.user.id, email: ctx.user.email ?? null },
      profile: ctx.profile,
      role: ctx.profile?.role ?? 'observer',
      isRoot: ctx.isRoot,
      source: 'server',
    },
  });
}

export async function HEAD(req: Request) {
  const gate = await requireRootActor('me.head');
  if (!gate.ok) return new Response(null, { status: gate.status });
  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'me.head', target: 'root_identity', request: req });
  return new Response(null, { status: audit.ok ? 204 : 500 });
}
