import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionPrototype } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!body.case_id) {
    return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
  }
  const result = await createScoreFrictionPrototype({
    case_id: String(body.case_id),
    mihm_cultural_vector: body.mihm_cultural_vector ?? {},
    platform_targets: Array.isArray(body.platform_targets) ? body.platform_targets : undefined,
    producer: typeof body.producer === 'string' ? body.producer : undefined,
    lyrics: typeof body.lyrics === 'string' ? body.lyrics : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
