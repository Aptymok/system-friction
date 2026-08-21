import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionPrototype } from '@/lib/scorefriction/store';

export const dynamic = 'force-dynamic';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: NextRequest) {
  const body = record(await request.json().catch(() => ({})));
  if (typeof body.case_id !== 'string' || !body.case_id.trim()) {
    return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
  }
  const productionBrief = record(body.production_brief);
  if (!Object.keys(productionBrief).length) {
    return NextResponse.json({ ok: false, error: 'production_brief_required' }, { status: 400 });
  }
  const result = await createScoreFrictionPrototype({
    case_id: body.case_id.trim(),
    mihm_cultural_vector: record(body.mihm_cultural_vector),
    platform_targets: Array.isArray(body.platform_targets) ? body.platform_targets.filter((item): item is string => typeof item === 'string') : undefined,
    producer: typeof body.producer === 'string' ? body.producer : undefined,
    lyrics: typeof body.lyrics === 'string' ? body.lyrics : undefined,
    production_brief: productionBrief,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
