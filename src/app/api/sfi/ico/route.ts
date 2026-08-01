import { NextResponse } from 'next/server';
import { runInstitutionalCognitiveScenario } from '@/lib/sfi/icoRuntime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await runInstitutionalCognitiveScenario({
      phenomenon: body.phenomenon || 'Fenómeno institucional',
      signal: body.signal,
      domain: body.domain,
      description: body.description,
      createdBy: body.createdBy || 'api/sfi/ico',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[sfi/ico] request failed', error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'unknown_error' }, { status: 500 });
  }
}
