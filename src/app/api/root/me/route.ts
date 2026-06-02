import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';
import { getServerUserContext } from '@/lib/server/productionBackend';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  if (ctx.isRoot) {
    const audit = await auditRootAction({
      actorId: ctx.user.id,
      action: 'me.read',
      target: 'root_identity',
      payload: { role: ctx.profile?.role ?? null },
      request: req,
    });
    if (!audit.ok) return NextResponse.json(audit, { status: 500 });
  }

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
