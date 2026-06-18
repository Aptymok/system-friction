import { NextResponse } from 'next/server';
import { buildPublisherDraftRuntime } from '@/lib/publisher/publisherRuntime';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const draft = await buildPublisherDraftRuntime();
    return NextResponse.json({ ok: true, patch: 'SFI_PIPELINE_MINIMAL_PATCH', draft });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      patch: 'SFI_PIPELINE_MINIMAL_PATCH',
      error: error instanceof Error ? error.message : 'publisher_draft_failed',
    }, { status: 500 });
  }
}
