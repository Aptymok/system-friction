import { NextRequest, NextResponse } from 'next/server';
import { readContinuityActionableWorkGate } from '@/lib/continuity/actionableWorkGate';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';

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
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized_continuity_wakeup' }, { status: 401 });
  }

  const requestedCycleId = request.nextUrl.searchParams.get('cycleId')?.trim() || null;
  const gate = await readContinuityActionableWorkGate({ requestedCycleId });

  return NextResponse.json({
    ok: true,
    trigger: authorization.trigger,
    ...gate,
    boundary: 'Read-only scheduler gate. It never creates continuity runs, health checks, evidence, memory, RETURN, learning, canon, or external actions.',
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
