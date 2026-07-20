import { NextResponse } from 'next/server';
import { runStudioCulturalPipeline } from '@/lib/studio/cultural-lab/pipeline';
import type { StudioArtifactInput } from '@/lib/studio/cultural-lab/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as StudioArtifactInput;
    const trace = await runStudioCulturalPipeline(input);
    const simulation = trace.stages.find((stage) => stage.id === 'simulation_engine');
    return NextResponse.json({ ok: true, simulation, trace });
  } catch (error) {
    console.error('[Studio Simulate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'error_desconocido';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}