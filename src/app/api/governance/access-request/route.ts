import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const accessLevels = ['VIEW_ONLY', 'DEMO', 'LIMITED_OPERATOR', 'PARTNER', 'CORE_ACCESS'] as const;

type AccessRequest = {
  actor?: string;
  requested_access?: string;
  purpose?: string;
  asset?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as AccessRequest;
  const requested = (body.requested_access || 'VIEW_ONLY').toUpperCase();
  const normalized = accessLevels.includes(requested as typeof accessLevels[number]) ? requested : 'VIEW_ONLY';
  const isCore = normalized === 'CORE_ACCESS' || (body.asset || '').toLowerCase().includes('motor');

  return NextResponse.json({
    ok: true,
    status: 'access_request_classified_not_persisted',
    request: {
      actor: body.actor || 'unknown',
      asset: body.asset || 'unspecified',
      purpose: body.purpose || 'unspecified',
      requested_access: normalized,
      decision: isCore ? 'DENY_UNTIL_CONTRACT_AND_SCOPE' : 'ALLOW_LIMITED_REVIEW',
      allowed_initial_level: isCore ? 'DEMO' : normalized,
      conditions: [
        'No transfer of core generator without written scope.',
        'Attribution and monetization terms must be explicit.',
        'All external operation starts as VIEW_ONLY, DEMO, or LIMITED_OPERATOR.',
      ],
    },
  });
}
