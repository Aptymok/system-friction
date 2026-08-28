import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase, normalizeAndRegisterOperationalCaseSource } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import {
  SFI_CASE_DIRECT_UPLOAD_MAX_BYTES,
  SFI_CASE_LEGACY_PROXY_MAX_BYTES,
  SFI_CASE_SOURCE_BUCKET,
  createCaseSourceStoragePath,
  normalizeCaseSourceContentType,
  normalizeCaseSourceType,
  safeCaseSourceFilename,
} from '@/lib/sfi/case-platform/directUpload';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const envelope = await readOperationalCase(caseId, user.id);
    const form = await request.formData();
    const value = form.get('file');
    if (!(value instanceof File)) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_FILE_REQUIRED' }, { status: 400 });
    if (value.size <= 0 || value.size > SFI_CASE_DIRECT_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ ok: false, error: 'SFI_SOURCE_FILE_SIZE_INVALID', maxBytes: SFI_CASE_DIRECT_UPLOAD_MAX_BYTES }, { status: 400 });
    }
    if (value.size > SFI_CASE_LEGACY_PROXY_MAX_BYTES) {
      return NextResponse.json({
        ok: false,
        error: 'SFI_SOURCE_DIRECT_UPLOAD_REQUIRED',
        proxyMaxBytes: SFI_CASE_LEGACY_PROXY_MAX_BYTES,
        directUploadMaxBytes: SFI_CASE_DIRECT_UPLOAD_MAX_BYTES,
        directUpload: {
          ticketEndpoint: `/api/cases/${caseId}/sources/upload-ticket`,
          finalizeEndpoint: `/api/cases/${caseId}/sources/finalize-upload`,
          rationale: 'Raw file bytes larger than the compatibility threshold must bypass Vercel and upload directly to Supabase Storage.',
        },
      }, { status: 413 });
    }

    const contentType = normalizeCaseSourceContentType(value.type || 'application/octet-stream');
    const bytes = Buffer.from(await value.arrayBuffer());
    const contentHash = createHash('sha256').update(bytes).digest('hex');
    const filename = safeCaseSourceFilename(value.name);
    const sourceType = normalizeCaseSourceType(form.get('sourceType'));
    const storagePath = createCaseSourceStoragePath({ tenantId: envelope.caseRecord.tenantId, caseId, filename });
    const service = createServiceSupabaseClient();
    const upload = await service.storage.from(SFI_CASE_SOURCE_BUCKET).upload(storagePath, bytes, { contentType, cacheControl: '3600', upsert: false });
    if (upload.error) throw new Error(`SFI_SOURCE_FILE_UPLOAD_FAILED:${upload.error.message}`);

    const uri = `storage://${SFI_CASE_SOURCE_BUCKET}/${storagePath}`;
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
            intakeMode: 'VERCEL_PROXY_COMPATIBILITY',
            tenantId: envelope.caseRecord.tenantId,
            caseId,
            filename,
            size: value.size,
            contentType,
            storagePath,
            visibility: 'private',
            contentHashBasis: 'SERVER_VERIFIED_SHA256',
            epistemicBoundary: 'SOURCE_NOT_EVIDENCE',
            vercelBoundary: `COMPATIBILITY_ONLY_MAX_${SFI_CASE_LEGACY_PROXY_MAX_BYTES}_BYTES`,
          },
        },
      });
      return NextResponse.json({
        ok: true,
        source,
        file: { filename, size: value.size, contentType, uri, contentHash, visibility: 'private' },
        warning: 'VERCEL_PROXY_COMPATIBILITY_PATH: use signed direct upload for normal file ingestion.',
      }, { status: 201 });
    } catch (error) {
      await service.storage.from(SFI_CASE_SOURCE_BUCKET).remove([storagePath]);
      throw error;
    }
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
