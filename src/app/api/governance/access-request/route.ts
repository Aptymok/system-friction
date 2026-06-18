import { NextRequest, NextResponse } from 'next/server';
import { appendOperationalEvent, getOperationalEvents } from '@/lib/operational/events';

export const dynamic = 'force-dynamic';

const accessLevels = ['VIEW_ONLY', 'DEMO', 'LIMITED_OPERATOR', 'PARTNER', 'CORE_ACCESS'] as const;

type AccessRequest = {
  actor?: string;
  requested_access?: string;
  purpose?: string;
  asset?: string;
};

export async function GET() {
  const decisions = getOperationalEvents().filter((event) => event.kind === 'governance_decision');
  return NextResponse.json({
    ok: true,
    status: 'p02_in_memory_governance_decisions',
    accessLevels,
    decisions,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as AccessRequest;
  const requested = (body.requested_access || 'VIEW_ONLY').toUpperCase();
  const normalized = accessLevels.includes(requested as typeof accessLevels[number]) ? requested : 'VIEW_ONLY';
  const isCore = normalized === 'CORE_ACCESS' || (body.asset || '').toLowerCase().includes('motor') || (body.asset || '').toLowerCase().includes('core');
  const decision = isCore ? 'DENY_UNTIL_CONTRACT_AND_SCOPE' : 'ALLOW_LIMITED_REVIEW';
  const allowedInitialLevel = isCore ? 'DEMO' : normalized;

  const event = appendOperationalEvent({
    organ: 'governance',
    kind: 'governance_decision',
    title: `Gobernanza de acceso: ${body.actor || 'unknown'}`,
    summary: `Solicitud clasificada. Decisión: ${decision}. Nivel inicial permitido: ${allowedInitialLevel}.`,
    source: 'governance/access-request',
    risk: isCore ? 'high' : 'medium',
    status: isCore ? 'blocked' : 'approved',
    payload: {
      actor: body.actor || 'unknown',
      asset: body.asset || 'unspecified',
      purpose: body.purpose || 'unspecified',
      requested_access: normalized,
      decision,
      allowed_initial_level: allowedInitialLevel,
      conditions: [
        'No transfer of core generator without written scope.',
        'Attribution and monetization terms must be explicit.',
        'All external operation starts as VIEW_ONLY, DEMO, or LIMITED_OPERATOR.',
      ],
    },
    next_action: isCore ? 'Prepare DEMO package, not core transfer.' : 'Prepare limited review material.',
  });

  return NextResponse.json({ ok: true, status: 'access_request_classified_and_registered_in_memory', request: event });
}
