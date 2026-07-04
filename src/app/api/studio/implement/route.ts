import { NextResponse } from 'next/server';
import { runStudioCulturalPipeline } from '@/lib/studio/cultural-lab/pipeline';
import type { StudioArtifactInput } from '@/lib/studio/cultural-lab/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const input = await request.json() as StudioArtifactInput;
  const trace = await runStudioCulturalPipeline(input);
  const implementation = trace.stages.find((stage) => stage.id === 'implementation_console');
  return NextResponse.json({ ok: true, implementation, trace });
}
