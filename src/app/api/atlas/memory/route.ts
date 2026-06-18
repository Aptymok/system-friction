import { NextResponse } from 'next/server';
import { buildAtlasMemoryRuntime } from '@/lib/atlas/atlasMemoryRuntime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memory = await buildAtlasMemoryRuntime();
    return NextResponse.json({ ok: true, patch: 'SFI_PIPELINE_MINIMAL_PATCH', memory });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      patch: 'SFI_PIPELINE_MINIMAL_PATCH',
      error: error instanceof Error ? error.message : 'atlas_memory_failed',
    }, { status: 500 });
  }
}
