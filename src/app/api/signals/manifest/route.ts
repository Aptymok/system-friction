import { NextRequest, NextResponse } from 'next/server';
import { manifestPersistentSignal } from '@/lib/signals/persistentSignalInstrument';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.source_type || typeof body.source_type !== 'string') {
      return NextResponse.json({ ok: false, error: 'source_type_required' }, { status: 400 });
    }

    if (!body.content && !body.content_hash && !body.label && !body.source_id) {
      return NextResponse.json({ ok: false, error: 'signal_identity_required' }, { status: 400 });
    }

    const result = await manifestPersistentSignal(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'signal_manifest_request_failed', details: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
