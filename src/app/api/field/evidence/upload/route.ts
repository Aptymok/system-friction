import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/', 'text/'];
const ALLOWED_TYPES = new Set(['application/pdf', 'application/json', 'application/zip', 'application/vnd.ms-excel', 'text/csv']);

function safeFilename(value: string) {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(-160) || 'evidence.bin';
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const form = await request.formData();
    const value = form.get('file');
    if (!(value instanceof File)) {
      return NextResponse.json({ ok: false, error: 'FIELD_FILE_REQUIRED' }, { status: 400 });
    }
    if (value.size <= 0 || value.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'FIELD_FILE_SIZE_INVALID', maxBytes: MAX_BYTES }, { status: 400 });
    }
    const contentType = value.type || 'application/octet-stream';
    const allowed = ALLOWED_TYPES.has(contentType) || ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix));
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'FIELD_FILE_TYPE_NOT_ALLOWED', contentType }, { status: 415 });
    }

    const filename = safeFilename(value.name);
    const storagePath = `${user.id}/field/${randomUUID()}/${filename}`;
    const service = createServiceSupabaseClient();
    const bytes = Buffer.from(await value.arrayBuffer());
    const upload = await service.storage.from('field-evidence').upload(storagePath, bytes, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });
    if (upload.error) {
      return NextResponse.json({ ok: false, error: 'FIELD_FILE_UPLOAD_FAILED', details: upload.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      file: {
        filename,
        size: value.size,
        contentType,
        storagePath,
        uri: `storage://field-evidence/${storagePath}`,
        visibility: 'private',
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'FIELD_FILE_UPLOAD_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
