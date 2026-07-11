import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { loadStudioAudioBytes } from '@/lib/studio/audio/audioStorage';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    await requireObjectOwner(objectId);
    const stored = await loadStudioAudioBytes(objectId, {});
    const body = new ArrayBuffer(stored.bytes.byteLength);
    new Uint8Array(body).set(stored.bytes);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': stored.upload.mime_type ?? stored.object.mime_type ?? 'application/octet-stream',
        'Content-Length': String(stored.byteLength),
        'Cache-Control': 'private, no-store',
        'Accept-Ranges': 'none',
        'X-Studio-Audio-Checksum': stored.checksumSha256,
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    const body = toStudioAudioApiError(error);
    const status = isStudioAudioError(error) ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
