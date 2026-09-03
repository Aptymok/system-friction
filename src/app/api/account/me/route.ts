import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const ctx = await getServerUserContext();
  if (ctx.authState === 'unavailable') {
    return NextResponse.json({
      ok: false,
      error: 'AUTH_UNAVAILABLE',
      details: ctx.authError ?? 'Authentication verification is temporarily unavailable.',
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const profile = ctx.profile && typeof ctx.profile === 'object' ? ctx.profile : null;
  return NextResponse.json({
    ok: true,
    data: {
      isRoot: ctx.isRoot,
      canObserveRoot: ctx.canObserveRoot,
      role: ctx.isRoot ? 'root' : (typeof profile?.role === 'string' ? profile.role : 'observer'),
      user: {
        id: ctx.user.id,
        email: ctx.user.email ?? null,
      },
      profile: profile ? {
        alias: typeof profile.alias === 'string' ? profile.alias : null,
        email: typeof profile.email === 'string' ? profile.email : null,
        role: typeof profile.role === 'string' ? profile.role : null,
        module_access: profile.module_access ?? null,
      } : null,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
