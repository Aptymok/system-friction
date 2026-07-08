import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { createStudioUploadObject } from '@/lib/studio/production/studioProductionRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STUDIO_BUCKET = 'studio-objects';

function inferObjectType(file: File) {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (mime.startsWith('audio/') || /\.(mp3|wav|m4a|flac|ogg|aiff)$/.test(name)) return 'music';
  if (mime.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/.test(name)) return 'video';
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/.test(name)) return 'image';
  if (/\.(txt|md|rtf|pdf|doc|docx)$/.test(name)) return 'text';
  return 'unknown';
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'studio-object';
}

async function ensureStudioBucket(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const current = await supabase.storage.getBucket(STUDIO_BUCKET);
  if (!current.error) return;

  const missing = current.error.message.toLowerCase().includes('not found') || current.error.message.toLowerCase().includes('does not exist');
  if (!missing) throw current.error;

  const created = await supabase.storage.createBucket(STUDIO_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024 * 500,
  });
  if (created.error) throw created.error;
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });

  try {
    const supabase = createServiceSupabaseClient();
    const objectType = String(form?.get('objectType') || inferObjectType(file));
    const title = String(form?.get('title') || file.name.replace(/\.[^.]+$/, '') || file.name);
    const sessionId = typeof form?.get('sessionId') === 'string' ? String(form.get('sessionId')) : null;
    const storagePath = `studio/${Date.now()}-${safeFileName(file.name)}`;
    const bytes = await file.arrayBuffer();

    await ensureStudioBucket(supabase);

    const upload = await supabase.storage.from(STUDIO_BUCKET).upload(storagePath, bytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (upload.error) throw upload.error;

    const result = await createStudioUploadObject({
      sessionId,
      title,
      objectType,
      mimeType: file.type || null,
      sizeBytes: file.size,
      storagePath,
    });
    return NextResponse.json(result, { status: result.ok ? 201 : result.status });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'studio_upload_unavailable',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
