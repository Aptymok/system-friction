import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type OpportunityRequest = {
  actor?: string;
  interest?: string;
  requested_asset?: string;
  opportunity_type?: 'client' | 'ally' | 'operator' | 'promoter' | 'partner' | 'unknown';
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: 'stub_no_database_write',
    message: 'Market organ exists. P02 must connect this route to persistent storage.',
    requiredFields: ['actor', 'interest', 'requested_asset', 'opportunity_type', 'risk_level', 'status', 'next_action'],
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as OpportunityRequest;
  const requestedAsset = body.requested_asset || 'unspecified';
  const risk = requestedAsset.toLowerCase().includes('motor') || requestedAsset.toLowerCase().includes('core') ? 'high' : 'medium';

  return NextResponse.json({
    ok: true,
    status: 'opportunity_classified_not_persisted',
    opportunity: {
      actor: body.actor || 'unknown',
      interest: body.interest || 'unknown',
      requested_asset: requestedAsset,
      opportunity_type: body.opportunity_type || 'unknown',
      risk_level: risk,
      next_action: risk === 'high' ? 'Route to governance/access-request before sharing assets.' : 'Prepare limited demo or public material.',
    },
  });
}
