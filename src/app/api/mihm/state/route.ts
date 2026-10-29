import { assessMihmInstrumentCompatibility } from '@/lib/mihm/instrumentContract';
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

  const instrumentCompatibility=assessMihmInstrumentCompatibility({readings:[instrumentState,worldInstrumentState],links:[{left:0,right:1,operation:'CONTEXT'}],timeCut:new Date().toISOString()});

  return NextResponse.json({
    ok: true,
    data: {
      analyses: [],
      instrumentCompatibility,
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
