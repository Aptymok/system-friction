import { NextRequest, NextResponse } from 'next/server';
import { runContinuityHeartbeat } from '@/lib/continuity/runtime';
import { runStudioAutonomyContinuation } from '@/lib/continuity/studioAutonomy';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';
import { runGovernedExecutionRouter } from '@/lib/execution/governedExecutionRouter';

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

  try {
    const result = await runContinuityHeartbeat(authorization.trigger);
    const [studioAutonomy, governedExecution] = await Promise.all([
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
      runGovernedExecutionRouter({ limit: 10 }).catch((error) => ({
        ok: false as const,
        processed: 0,
        results: [],
        error: error instanceof Error ? error.message : String(error),
      })),
    ]);

    return NextResponse.json({
      ok: result.status !== 'FAILED',
      trigger: authorization.trigger,
      ...result,
      studioAutonomy,
      governedExecution,
      executionRule: 'Hourly continuity reuses the existing GitHub Actions OIDC heartbeat to retry/reroute governance-authorized queued work. No new scheduler, authority, external side effect, or canon permission is introduced.',
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_heartbeat_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
