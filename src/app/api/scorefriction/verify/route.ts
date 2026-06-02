import { NextRequest, NextResponse } from 'next/server';
import { recordScoreFrictionVerification } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.prototype_id || !body.platform) {
    return NextResponse.json({ ok: false, error: 'prototype_id_and_platform_required' }, { status: 400 });
  }
  const result = await recordScoreFrictionVerification({
    prototype_id: String(body.prototype_id),
    platform: String(body.platform),
    metrics: body.metrics ?? {},
    interpretation: body.interpretation ?? {},
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
