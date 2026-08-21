import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase, normalizeAndRegisterOperationalCaseSource } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'audio/', 'video/', 'text/'];
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/json',
  'application/zip',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

function safeFilename(value: string) {
  const cleaned = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.slice(-180) || 'source.bin';
}

function safeSourceType(value: FormDataEntryValue | null) {
  const source = typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9:_-]+/g, '_') : '';
  return source.slice(0, 160) || 'DECLARED_BY_PROTOCOL';
}

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const envelope = await readOperationalCase(caseId, user.id);
    const form = await request.formData();
    const value = form.get('file');
    if (!(value instanceof File)) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_FILE_REQUIRED' }, { status: 400 });
    if (value.size <= 0 || value.size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_FILE_SIZE_INVALID', maxBytes: MAX_BYTES }, { status: 400 });

    const contentType = value.type || 'application/octet-stream';
    const allowed = ALLOWED_TYPES.has(contentType) || ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix));
    if (!allowed) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_FILE_TYPE_NOT_ALLOWED', contentType }, { status: 415 });

    const bytes = Buffer.from(await value.arrayBuffer());
    const contentHash = createHash('sha256').update(bytes).digest('hex');
    const filename = safeFilename(value.name);
    const sourceType = safeSourceType(form.get('sourceType'));
    const storagePath = `${envelope.caseRecord.tenantId}/${caseId}/source/${randomUUID()}/${filename}`;
    const service = createServiceSupabaseClient();
    const upload = await service.storage.from('field-evidence').upload(storagePath, bytes, { contentType, cacheControl: '3600', upsert: false });
    if (upload.error) throw new Error(`SFI_SOURCE_FILE_UPLOAD_FAILED:${upload.error.message}`);

    const uri = `storage://field-evidence/${storagePath}`;
    try {
      const source = await normalizeAndRegisterOperationalCaseSource({
        caseId,
        userId: user.id,
        source: {
          id: `file:${contentHash}`,
          sourceType,
          label: filename,
          externalRef: uri,
          observedAt: new Date().toISOString(),
          contentHash,
          metadata: {
            intakeMode: 'PRIVATE_FILE_UPLOAD',
            tenantId: envelope.caseRecord.tenantId,
            caseId,
            filename,
            size: value.size,
            contentType,
            storagePath,
            visibility: 'private',
            epistemicBoundary: 'SOURCE_NOT_EVIDENCE',
          },
        },
      });
      return NextResponse.json({ ok: true, source, file: { filename, size: value.size, contentType, uri, contentHash, visibility: 'private' } }, { status: 201 });
    } catch (error) {
      await service.storage.from('field-evidence').remove([storagePath]);
      throw error;
    }
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
