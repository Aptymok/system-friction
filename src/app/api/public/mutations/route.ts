import { NextResponse } from 'next/server';
import { readSystemMutationLedger } from '@/lib/sfi/mutationEvidence';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const ledger = await readSystemMutationLedger(80);
  return NextResponse.json({
    ...ledger,
    generatedAt: new Date().toISOString(),
    publicBoundary: 'This surface exposes repository mutation identity and validation stage only. Internal QA payloads, deployment metadata, cycle contents and learning payloads remain on governed surfaces.',
  }, {
    status: ledger.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
