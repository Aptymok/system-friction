import { NextRequest, NextResponse } from 'next/server';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { persistIndicatorSnapshot } from '@/lib/sfi/indicatorSnapshot';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cronSecret() {
  return process.env.SFI_INDICATORS_CRON_SECRET || process.env.CRON_SECRET || '';
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function authorizeCron(request: NextRequest) {
  const secret = cronSecret();
  const token = bearerToken(request);
  const production = process.env.NODE_ENV === 'production';

  if (!secret && production) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: 'sfi_indicators_cron_secret_missing',
          message: 'SFI_INDICATORS_CRON_SECRET or CRON_SECRET must be configured in production.',
        },
        { status: 503 },
      ),
    };
  }

  if (!secret && !production) {
    return { ok: true as const, warnings: ['sfi_indicators_cron_secret_missing_local_dev_allowed'] };
  }

  if (!token || token !== secret) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'unauthorized_sfi_indicators_cron' }, { status: 401 }),
    };
  }

  return { ok: true as const, warnings: [] as string[] };
}

export async function GET(request: NextRequest) {
  const auth = authorizeCron(request);
  if (!auth.ok) return auth.response;

  const [state, worldVector] = await Promise.all([
    buildSfiWorldInterfaceState(),
    buildWorldVectorOperationalState().catch(() => null),
  ]);

  const domainBreakdown = worldVector?.today.observation.domain_values ?? [];
  const result = await persistIndicatorSnapshot(state, domainBreakdown);

  return NextResponse.json({
    ok: result.ok,
    capturedAt: state.generatedAt,
    domainCount: domainBreakdown.length,
    warnings: [...auth.warnings, ...(result.ok ? [] : [result.error])],
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
