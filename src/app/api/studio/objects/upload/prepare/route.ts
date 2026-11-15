import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Default Studio intake is local-only. Originals must not be implicitly persisted.
// A future temporary-processing route requires its own explicit authorization and
// must prove deletion/cleanup; a signed durable upload is not that route.
export async function POST() {
  return NextResponse.json({
    ok: false,
    error: 'STUDIO_ORIGINAL_PERSISTENCE_DISABLED',
    status: 'LOCAL_PROCESSING_ONLY',
    message: 'Original uploads are disabled by default. Use the private local analysis in /studio.',
  }, { status: 410 });
}
