import { NextRequest, NextResponse } from 'next/server';
import { verifyGitHubActionsOidcToken } from '@/lib/continuity/githubActionsOidc';
import {
  readDataPlaneReconciliationStatus,
  attemptBoundedDataPlaneReconciliation,
} from '@/lib/persistence/dataPlaneReconciliationControl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearer(request: NextRequest) {
  return (request.headers.get('authorization') ?? '').match(/^Bearer\\s+(.+)$/i)?.[1]?.trim() ?? '';
}

async function authorized(request: NextRequest) {
  const token = bearer(request);
  const secret = process.env.SFI_CONTINUITY_CRON_SECRET || process.env.CRON_SECRET || '';
  if (secret && token === secret) return true;
  if (!token) return false;
  return (await verifyGitHubActionsOidcToken(token)).ok === true;
}

export async function GET(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({ ok: false, error: 'authorized_scheduler_required' }, { status: 401 });
  }
  try {
    const status = await readDataPlaneReconciliationStatus();
    return NextResponse.json({ ok: true, effect: 'READ', status }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: 'data_plane_status_unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await authorized(request)) {
    return NextResponse.json({ ok: false, error: 'authorized_scheduler_required' }, { status: 401 });
  }
  try {
    const receipt = await attemptBoundedDataPlaneReconciliation(8);
    return NextResponse.json({
      ...receipt,
      execution: 'SCHEDULED_BOUNDED_RECONCILIATION',
      forcedFailover: false,
    }, {
      status: receipt.ok ? 200 : 409,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'bounded_reconciliation_failed',
      forcedFailover: false,
    }, { status: 503 });
  }
}
