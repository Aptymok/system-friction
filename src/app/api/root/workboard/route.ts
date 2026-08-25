import { NextResponse } from 'next/server';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { readRootOperationalWorkboard } from '@/lib/root/operationalWorkboard';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const gate = await requireRootViewer('root.workboard.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const authority = resolveProposalReviewerAuthority(gate.ctx);
  try {
    const workboard = await readRootOperationalWorkboard({ authority });
    return NextResponse.json({ ok: true, workboard }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_workboard_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
