import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { normalizeAndRegisterOperationalCaseSource, readOperationalCase } from '@/lib/sfi/case-platform/repository';
import { sfiCaseApiFailure } from '@/lib/sfi/case-platform/http';
import {
  SFI_CASE_SOURCE_BUCKET,
  assertCaseSourceStoragePath,
  normalizeCaseSourceContentType,
  normalizeCaseSourceSize,
  normalizeCaseSourceType,
  normalizeOptionalContentHash,
  safeCaseSourceFilename,
} from '@/lib/sfi/case-platform/directUpload';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 15;

type RouteContext = { params: Promise<{ caseId: string }> };
type Row = Record<string, unknown>;

function storageObjectSize(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const metadata = value as Row;
  const parsed = Number(metadata.size);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { user } = await requireAuthenticatedUser();
    const { caseId } = await context.params;
    const envelope = await readOperationalCase(caseId, user.id);
    const body = await request.json().catch(() => ({})) as Row;

    const storagePath = assertCaseSourceStoragePath({
      tenantId: envelope.caseRecord.tenantId,
      caseId,
      storagePath: typeof body.storagePath === 'string' ? body.storagePath.trim() : '',
    });
    const filename = safeCaseSourceFilename(typeof body.filename === 'string' ? body.filename : storagePath.split('/').at(-1) ?? 'source.bin');
    const size = normalizeCaseSourceSize(body.size);
    const contentType = normalizeCaseSourceContentType(body.contentType);
    const contentHash = normalizeOptionalContentHash(body.contentHash);
    const sourceType = normalizeCaseSourceType(body.sourceType);

    const parts = storagePath.split('/');
    const storedName = parts.pop() ?? '';
    const folder = parts.join('/');
    if (!storedName) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_STORAGE_PATH_INVALID' }, { status: 400 });

    const service = createServiceSupabaseClient();
    const listed = await service.storage.from(SFI_CASE_SOURCE_BUCKET).list(folder, { limit: 10, search: storedName });
    if (listed.error) throw new Error(`SFI_SOURCE_STORAGE_VERIFY_FAILED:${listed.error.message}`);
    const stored = (listed.data ?? []).find((item) => item.name === storedName);
    if (!stored) return NextResponse.json({ ok: false, error: 'SFI_SOURCE_STORAGE_OBJECT_NOT_FOUND' }, { status: 404 });

    const actualSize = storageObjectSize(stored.metadata);
    if (actualSize !== null && actualSize !== size) {
      return NextResponse.json({
        ok: false,
        error: 'SFI_SOURCE_STORAGE_SIZE_MISMATCH',
        declaredSize: size,
        storedSize: actualSize,
      }, { status: 409 });
    }

    const uri = `storage://${SFI_CASE_SOURCE_BUCKET}/${storagePath}`;
    const source = await normalizeAndRegisterOperationalCaseSource({
      caseId,
      userId: user.id,
      source: {
        id: contentHash ? `file:${contentHash}` : `file:${randomUUID()}`,
        sourceType,
        label: filename,
        externalRef: uri,
        observedAt: new Date().toISOString(),
        contentHash,
        metadata: {
          intakeMode: 'DIRECT_SUPABASE_STORAGE',
          tenantId: envelope.caseRecord.tenantId,
          caseId,
          filename,
          size,
          contentType,
          storagePath,
          visibility: 'private',
          storageObjectObserved: true,
          storageObjectId: stored.id ?? null,
          storageCreatedAt: stored.created_at ?? null,
          storageUpdatedAt: stored.updated_at ?? null,
          contentHashBasis: contentHash ? 'CLIENT_DECLARED_SHA256' : 'NOT_SUPPLIED',
          contentHashServerVerified: false,
          epistemicBoundary: 'SOURCE_NOT_EVIDENCE',
          vercelBoundary: 'CONTROL_PLANE_ONLY',
        },
      },
    });

    return NextResponse.json({
      ok: true,
      caseId,
      source,
      file: {
        filename,
        size,
        contentType,
        uri,
        contentHash,
        contentHashBasis: contentHash ? 'CLIENT_DECLARED_SHA256' : 'NOT_SUPPLIED',
        serverDownloadedForFinalization: false,
        visibility: 'private',
      },
      next: 'Extract deterministic observations from the stored source before substantive analysis. Source registration alone does not satisfy evidence or analysis sufficiency.',
    }, { status: 201 });
  } catch (error) {
    return sfiCaseApiFailure(error);
  }
}
