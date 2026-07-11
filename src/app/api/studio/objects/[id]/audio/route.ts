import { NextResponse } from 'next/server';
import { loadStudioAudioBytes } from '@/lib/studio/audio/audioStorage';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: 'AUTH_REQUIRED',
        details: authError?.message ?? 'Authenticated Studio session required.',
      }, { status: 401 });
    }

    const stored = await loadStudioAudioBytes(objectId, {});
    const body = new ArrayBuffer(stored.bytes.byteLength);
    new Uint8Array(body).set(stored.bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': stored.upload.mime_type ?? stored.object.mime_type ?? 'audio/wav',
        'Content-Length': String(stored.byteLength),
        'Cache-Control': 'private, no-store',
        'X-Studio-Audio-Checksum': stored.checksumSha256,
      },
    });
  } catch (error) {
    const body = toStudioAudioApiError(error);
    const status = isStudioAudioError(error) ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
