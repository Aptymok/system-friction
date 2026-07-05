import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    ok: false,
    status: 'blocked',
    reason: 'intervention_apply_requires_verified_simulation',
  }, { status: 202 });
}
