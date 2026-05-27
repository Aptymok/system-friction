import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { recordAcpSeen } from '@/lib/governance/governanceRuntime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await recordAcpSeen(ctx.user.id, ctx.user.email ?? null);

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
