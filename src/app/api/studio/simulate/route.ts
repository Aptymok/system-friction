import { NextResponse } from 'next/server';
import { runStudioCulturalPipeline } from '@/lib/studio/cultural-lab/pipeline';
import type { StudioArtifactInput } from '@/lib/studio/cultural-lab/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const input = await request.json() as StudioArtifactInput;
  const trace = await runStudioCulturalPipeline(input);
  const simulation = trace.stages.find((stage) => stage.id === 'simulation_engine');
  return NextResponse.json({ ok: true, simulation, trace });
}
