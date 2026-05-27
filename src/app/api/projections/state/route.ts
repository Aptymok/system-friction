import { NextResponse } from 'next/server';
import { latestActionProposals } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projections = await latestActionProposals(['projection'], 25);
  return NextResponse.json({ ok: true, data: { projections: projections.data, warnings: projections.error ? [projections.error] : [] } });
}
