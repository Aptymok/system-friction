import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import {
  SFI_CASE_SOURCE_BUCKET,
  createCaseSourceStoragePath,
  normalizeCaseSourceContentType,
  normalizeCaseSourceSize,
  normalizeOptionalContentHash,
  safeCaseSourceFilename,
  uploadStrategyForSize,
} from '@/lib/sfi/case-platform/directUpload';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

type RouteContext = { params: Promise<{ caseId: string }> };
type Row = Record<string, unknown>;

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const envelope = await readOperationalCase(caseId, user.id);
    const body = await request.json().catch(() => ({})) as Row;

    const filename = safeCaseSourceFilename(typeof body.filename === 'string' ? body.filename : 'source.bin');
    const size = normalizeCaseSourceSize(body.size);
    const contentType = normalizeCaseSourceContentType(body.contentType);
    const contentHash = normalizeOptionalContentHash(body.contentHash);
    const storagePath = createCaseSourceStoragePath({
      tenantId: envelope.caseRecord.tenantId,
      caseId,
      filename,
    });

    const service = createServiceSupabaseClient();
    const signed = await service.storage
      .from(SFI_CASE_SOURCE_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });
    if (signed.error || !signed.data) throw new Error(`SFI_SOURCE_SIGNED_UPLOAD_FAILED:${signed.error?.message ?? 'unknown'}`);

    return NextResponse.json({
      ok: true,
      caseId,
      upload: {
        bucket: SFI_CASE_SOURCE_BUCKET,
        storagePath,
        token: signed.data.token,
        signedUrl: signed.data.signedUrl,
        filename,
        size,
        contentType,
        contentHash,
        strategy: uploadStrategyForSize(size),
        expiresInSeconds: 7200,
      },
      finalize: {
        endpoint: `/api/cases/${caseId}/sources/finalize-upload`,
        required: ['storagePath', 'filename', 'size', 'contentType'],
        recommended: ['contentHash', 'sourceType'],
      },
      vercelBoundary: 'CONTROL_PLANE_ONLY: raw file bytes must be uploaded directly to Supabase Storage using the signed token/URL and must not traverse this Vercel route.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
