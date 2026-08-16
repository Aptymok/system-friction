import { NextRequest, NextResponse } from 'next/server';
import { runContinuityHeartbeat } from '@/lib/continuity/runtime';
import { runStudioAutonomyContinuation } from '@/lib/continuity/studioAutonomy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearer(request: NextRequest) {
  const match = (request.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function authorize(request: NextRequest) {
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';
  if (!secret && process.env.NODE_ENV !== 'production') return true;
  return Boolean(secret) && bearer(request) === secret;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ ok: false, error: 'unauthorized_continuity_cron' }, { status: 401 });
  try {
    const result = await runContinuityHeartbeat('vercel_cron');
    let studioAutonomy: Awaited<ReturnType<typeof runStudioAutonomyContinuation>> | { status: 'DEGRADED'; reason: string; targets: number; outcomes: [] };
    try {
      studioAutonomy = await runStudioAutonomyContinuation({
        mode: result.mode,
        continuityRunId: result.runId,
        observations: result.results.map((item) => ({
          capabilityId: item.capability.id,
          status: item.status,
          latencyMs: item.latencyMs,
          errorCode: item.errorCode ?? null,
        })),
      });
    } catch (error) {
      studioAutonomy = {
        status: 'DEGRADED',
        reason: error instanceof Error ? error.message : String(error),
        targets: 0,
        outcomes: [],
      };
    }
    return NextResponse.json({ ok: result.status !== 'FAILED', ...result, studioAutonomy });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'continuity_heartbeat_failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
