import { NextResponse } from 'next/server';
import { latestActionProposals, latestRows } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [proposals, mutations] = await Promise.all([
    latestActionProposals(['mutation'], 25),
    latestRows('logbook_mutations', 25),
  ]);
  return NextResponse.json({
    ok: true,
    data: {
      proposals: proposals.data,
      mutations: mutations.data,
      warnings: [proposals.error, mutations.error].filter(Boolean),
    },
  });
}
