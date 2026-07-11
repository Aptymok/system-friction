import { NextRequest, NextResponse } from 'next/server';
import { reconcilePredictiveRuns } from '@/lib/predictive-engine/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function cronSecret() {
  return process.env.PREDICTIVE_ENGINE_CRON_SECRET || process.env.CRON_SECRET || '';
}

function token(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? '';
}

function authorize(request: NextRequest) {
  const secret = cronSecret();
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_ENGINE_CRON_SECRET_MISSING' }, { status: 503 });
  }
  if (secret && token(request) !== secret) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED_PREDICTIVE_ENGINE_CRON' }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const result = await reconcilePredictiveRuns();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'PREDICTIVE_RECONCILE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
