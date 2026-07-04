import { NextResponse } from 'next/server';
import { runStudioCulturalPipeline } from '@/lib/studio/cultural-lab/pipeline';
import type { StudioArtifactInput } from '@/lib/studio/cultural-lab/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = await request.json() as StudioArtifactInput;
    if (!input?.title || !input?.kind) {
      return NextResponse.json({ ok: false, error: 'missing_artifact_title_or_kind' }, { status: 400 });
    }
    const trace = await runStudioCulturalPipeline(input);
    return NextResponse.json({ ok: true, trace });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'studio_pipeline_failed' }, { status: 500 });
  }
}
