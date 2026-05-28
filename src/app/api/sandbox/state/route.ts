import { NextResponse } from 'next/server';
import { latestActionProposals } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sandbox = await latestActionProposals(['sandbox_snapshot', 'sandbox_diff'], 25);
  return NextResponse.json({ ok: true, data: { sandbox: sandbox.data, warnings: sandbox.error ? [sandbox.error] : [] } });
}
