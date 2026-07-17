import { NextResponse } from 'next/server';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';
import { scoreFrictionToInstrumentState } from '@/lib/mihm/adapters/scoreFrictionInstrumentAdapter';
import { worldVectorToInstrumentState } from '@/lib/mihm/adapters/worldVectorInstrumentAdapter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = await buildDerivedMihmRuntime();
  const [instrumentState, worldInstrumentState] = await Promise.all([
    scoreFrictionToInstrumentState(runtime),
    worldVectorToInstrumentState(),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      analyses: [],
      runtime,
      instrumentState,
      instrumentStates: {
        systemic: instrumentState,
        world: worldInstrumentState,
      },
      warnings: runtime.warnings ?? [],
    },
  });
}
