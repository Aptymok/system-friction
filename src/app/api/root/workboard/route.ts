import { NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { readRootOperationalNext } from '@/lib/root/operationalNext';
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
    const [base, operationalNext] = await Promise.all([
      readRootOperationalWorkboard({ authority }),
      readRootOperationalNext(),
    ]);
    const providers = getLlmProviderStatus();
    const reports = {
      ...base.reports,
      health: {
        ...base.reports.health,
        providers,
        degradedProviderCount: providers.filter((provider) => provider.state === 'DEGRADED' || provider.state === 'BLOCKED').length,
        providerHealthBoundary: 'configured/credential_present is not execution proof. HEALTHY requires an observed successful model call; UNTESTED means configured without observed canary/runtime success in this process.',
      },
    };
    const workboard = { ...base, reports, operationalNext };
    return NextResponse.json({ ok: true, workboard }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_workboard_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
