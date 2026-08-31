import { NextResponse } from 'next/server';
import { getLlmProviderStatus } from '@/lib/ai/providerRouter';
import { readContinuityDashboard } from '@/lib/continuity/runtime';
import { resolveProposalReviewerAuthority } from '@/lib/governance/proposalReviewer';
import { readRootOperationalNext } from '@/lib/root/operationalNext';
import { readRootOperationalWorkboard } from '@/lib/root/operationalWorkboard';
import { requireRootViewer } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function ageMinutes(value: unknown) {
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.max(0, (Date.now() - parsed) / 60_000) : null;
}

export async function GET() {
  const gate = await requireRootViewer('root.workboard.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const authority = resolveProposalReviewerAuthority(gate.ctx);
  try {
    const [base, operationalNext, continuityDashboard] = await Promise.all([
      readRootOperationalWorkboard({ authority }),
      readRootOperationalNext(),
      readContinuityDashboard(),
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

    const continuityState = continuityDashboard.state ?? {};
    const latestRun = continuityDashboard.runs?.[0] ?? null;
    const lastHeartbeatAt = continuityState.last_heartbeat_at ?? null;
    const heartbeatAgeMinutes = ageMinutes(lastHeartbeatAt);
    const heartbeatHealth = heartbeatAgeMinutes === null
      ? 'UNKNOWN'
      : heartbeatAgeMinutes <= 75
        ? 'HEALTHY'
        : 'STALE';
    const continuity = {
      mode: continuityState.mode ?? 'UNKNOWN',
      lastHeartbeatAt,
      lastSuccessfulRunAt: continuityState.last_successful_run_at ?? null,
      heartbeatAgeMinutes,
      health: heartbeatHealth,
      expectedCadenceMinutes: 30,
      staleAfterMinutes: 75,
      scheduler: 'github_actions_oidc',
      fallback: 'vercel_daily',
      latestRun: latestRun ? {
        id: latestRun.id ?? null,
        status: latestRun.status ?? null,
        trigger: latestRun.trigger ?? null,
        startedAt: latestRun.started_at ?? null,
        completedAt: latestRun.completed_at ?? null,
      } : null,
      errors: continuityDashboard.errors,
      boundary: 'Heartbeat health is operational evidence that SFI was awakened. It is not proof that any specific cognitive cycle completed, acquired RETURN, contrasted reality or learned.',
    };

    const workboard = { ...base, reports, operationalNext, continuity };
    return NextResponse.json({ ok: true, workboard }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'root_workboard_read_failed',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
