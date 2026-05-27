import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { runKernelCycle } from '@/lib/kernel/runKernelCycle';

export const dynamic = 'force-dynamic';

export async function POST() {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runKernelCycle();

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json(result);
}
