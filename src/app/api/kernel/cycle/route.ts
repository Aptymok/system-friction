import { NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';
import { readGovernanceRuntime } from '@/lib/governance/governanceRuntime';
import { runKernelCycle } from '@/lib/kernel/runKernelCycle';

export const dynamic = 'force-dynamic';

export async function POST() {
  const ctx = await getServerUserContext();

  if (!ctx.user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const governance = await readGovernanceRuntime();

  if (governance.blindMode) {
    return NextResponse.json({
      ok: false,
      error: 'kernel_blocked_by_blind_mode',
      governance,
    }, { status: 423 });
  }

  const result = await runKernelCycle();

  if (!result.ok) {
    return NextResponse.json(result, { status: 409 });
  }

  return NextResponse.json({
    ...result,
    governance,
  });
}
