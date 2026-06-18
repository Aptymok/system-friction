import { NextRequest, NextResponse } from 'next/server';
import { appendOperationalEvent, getOperationalEvents } from '@/lib/operational/events';

export const dynamic = 'force-dynamic';

type OpportunityRequest = {
  actor?: string;
  interest?: string;
  requested_asset?: string;
  opportunity_type?: 'client' | 'ally' | 'operator' | 'promoter' | 'partner' | 'unknown';
};

export async function GET() {
  const opportunities = getOperationalEvents().filter((event) => event.kind === 'opportunity');
  return NextResponse.json({
    ok: true,
    status: 'p02_in_memory_opportunities',
    opportunities,
    requiredFields: ['actor', 'interest', 'requested_asset', 'opportunity_type', 'risk_level', 'status', 'next_action'],
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as OpportunityRequest;
  const requestedAsset = body.requested_asset || 'unspecified';
  const actor = body.actor || 'unknown';
  const risk = requestedAsset.toLowerCase().includes('motor') || requestedAsset.toLowerCase().includes('core') ? 'high' : 'medium';
  const event = appendOperationalEvent({
    organ: 'market',
    kind: 'opportunity',
    title: `Oportunidad registrada: ${actor}`,
    summary: `${actor} solicita o manifiesta interés: ${body.interest || 'unknown'}. Activo solicitado: ${requestedAsset}.`,
    risk,
    status: 'classified',
    source: 'market/opportunities',
    payload: {
      actor,
      interest: body.interest || 'unknown',
      requested_asset: requestedAsset,
      opportunity_type: body.opportunity_type || 'unknown',
    },
    next_action: risk === 'high' ? 'Route to governance/access-request before sharing assets.' : 'Prepare limited demo or public material.',
  });

  return NextResponse.json({
    ok: true,
    status: 'opportunity_classified_and_registered_in_memory',
    opportunity: event,
  });
}
