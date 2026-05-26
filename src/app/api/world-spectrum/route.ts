import { NextResponse } from 'next/server';
import { createKernelRoute } from '@/runtime/api/createKernelRoute';
import { getLatestWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

export const POST = createKernelRoute('world_spectrum');

export async function GET() {
  const snapshot = await getLatestWorldSpectSnapshot();

  if (!snapshot) {
    return NextResponse.json(
      { sources: [], warning: 'worldspect_snapshot_missing' },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      sources: snapshot.sources,
      wsi: snapshot.wsi,
      nti: snapshot.nti,
      observed_at: snapshot.observed_at,
      source_state: snapshot.source_state,
      ingest_mode: snapshot.ingest_mode,
    },
    { status: 200 }
  );
}
