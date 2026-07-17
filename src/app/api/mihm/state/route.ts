import { NextResponse } from 'next/server';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = await buildDerivedMihmRuntime();
  const instrumentState = await scoreFrictionToInstrumentState(runtime);

  return NextResponse.json({
    ok: true,
    data: {
      analyses: [],
      runtime,
      instrumentState,
      warnings: runtime.warnings ?? [],
    },
  });
}
