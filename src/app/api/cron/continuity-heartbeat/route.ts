import { NextRequest, NextResponse } from 'next/server';
import { runContinuityHeartbeat, runOperationalTransitionWatchdog } from '@/lib/continuity/runtime';
import { runStudioAutonomyContinuation } from '@/lib/continuity/studioAutonomy';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';
import { runGovernedExecutionRouter } from '@/lib/execution/governedExecutionRouter';
import { runUniversalCycleContinuation } from '@/lib/sfi/universalCycleContinuation';
import { runUniversalEmpiricalContinuation } from '@/lib/sfi/universalEmpiricalContinuation';
import { runUniversalReturnPlanUpgrade } from '@/lib/sfi/universalReturnPlanUpgrade';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AuthorizedTrigger = 'vercel_cron' | 'github_actions_oidc' | 'development';

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function authorize(request: NextRequest): Promise<{ ok: true; trigger: AuthorizedTrigger } | { ok: false }> {
  const token = bearer(request);
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';

  if (!token && !secret && process.env.NODE_ENV !== 'production') {
    return { ok: true, trigger: 'development' };
  }

  if (secret && token === secret) {
    return { ok: true, trigger: 'vercel_cron' };
  }

  if (token) {
    const oidc = await verifyGitHubActionsOidcToken(token);
    if (oidc.ok) return { ok: true, trigger: 'github_actions_oidc' };
  }

  return { ok: false };
}

export async function GET(request: NextRequest) {
  const authorization = await authorize(request);
  if (!authorization.ok) return NextResponse.json({ ok: false, error: 'unauthorized_continuity_cron' }, { status: 401 });

  const requestedCycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || undefined;

  try {
    const result = await runContinuityHeartbeat(authorization.trigger);
    const emergencyHalt = result.mode === 'EMERGENCY_HALT';

    const returnPlanUpgradeBefore = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalReturnPlanUpgrade({ limit: 4, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const [studioAutonomy, transitionWatchdog, governedExecution, universalCycleContinuation] = await Promise.all([
      runStudioAutonomyContinuation({
        mode: result.mode,
        continuityRunId: result.runId,
        observations: result.results.map((item) => ({
          capabilityId: item.capability.id,
          status: item.status,
          latencyMs: item.latencyMs,
          errorCode: item.errorCode ?? null,
        })),
      }).catch((error) => ({
        status: 'DEGRADED' as const,
        reason: error instanceof Error ? error.message : String(error),
        targets: 0,
        outcomes: [] as [],
      })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, evidenceJobs: [], riskAssessments: [], stale: [] })
        : runOperationalTransitionWatchdog().catch((error) => ({
            ok: false as const,
            error: error instanceof Error ? error.message : String(error),
            evidenceJobs: [],
            riskAssessments: [],
            stale: [],
          })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, processed: 0, results: [] })
        : runGovernedExecutionRouter({ limit: 10 }).catch((error) => ({
            ok: false as const,
            processed: 0,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          })),
      emergencyHalt
        ? Promise.resolve({ ok: true as const, halted: true as const, processed: 0, results: [] })
        : runUniversalCycleContinuation({ limit: 2, cycleId: requestedCycleId }).catch((error) => ({
            ok: false as const,
            processed: 0,
            requestedCycleId: requestedCycleId ?? null,
            results: [],
            error: error instanceof Error ? error.message : String(error),
          })),
    ]);

    const returnPlanUpgradeAfter = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalReturnPlanUpgrade({ limit: 4, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const universalEmpiricalContinuation = emergencyHalt
      ? { ok: true as const, halted: true as const, processed: 0, results: [] }
      : await runUniversalEmpiricalContinuation({ limit: 3, cycleId: requestedCycleId }).catch((error) => ({
          ok: false as const,
          processed: 0,
          requestedCycleId: requestedCycleId ?? null,
          results: [],
          error: error instanceof Error ? error.message : String(error),
        }));

    const laneFailure = transitionWatchdog.ok === false
      || governedExecution.ok === false
      || universalCycleContinuation.ok === false
      || returnPlanUpgradeBefore.ok === false
      || returnPlanUpgradeAfter.ok === false
      || universalEmpiricalContinuation.ok === false
      || studioAutonomy.status === 'DEGRADED';

    return NextResponse.json({
      ok: result.status !== 'FAILED' && !laneFailure,
      trigger: authorization.trigger,
      requestedCycleId: requestedCycleId ?? null,
      ...result,
      studioAutonomy,
      transitionWatchdog,
      governedExecution,
      returnPlanUpgradeBefore,
      universalCycleContinuation,
      returnPlanUpgradeAfter,
      universalEmpiricalContinuation,
      executionRule: emergencyHalt
        ? 'EMERGENCY_HALT suppresses transition writes, governed execution dispatch, universal cognitive continuation, empirical continuation and learning writes. Continuity probes may record the halted heartbeat only.'
        : 'One heartbeat owns the complete governed continuation path: legacy RETURN plans are upgraded to AI-governed capability routing, interrupted cognition resumes from durable checkpoints using a sealed Cognitive Twin context, real evidence-linked RETURNs advance through AI-assisted CONTRAST and existing empirical closure rules, and calibrated learning becomes adaptive non-canonical Twin context. Missing evidence remains missing; no RETURN, canon mutation or irreversible external authority is fabricated.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_heartbeat_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
