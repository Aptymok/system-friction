import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { authorizeExternalRequest, externalActor, externalAuthError } from '@/lib/sfi/externalAuth';
import { appendOperationalEvent } from '@/lib/operational/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const STUDIO_BUCKET = 'studio-objects';

type ListedObject = { name: string; id?: string | null; metadata?: unknown };

async function listFilesRecursively(prefix = ''): Promise<string[]> {
  const db = createServiceSupabaseClient();
  const out: string[] = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const listed = await db.storage.from(STUDIO_BUCKET).list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (listed.error) {
      const message = listed.error.message.toLowerCase();
      if (message.includes('not found') || message.includes('does not exist')) return out;
      throw listed.error;
    }
    const rows = (listed.data ?? []) as ListedObject[];
    for (const item of rows) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id || item.metadata) out.push(path);
      else out.push(...await listFilesRecursively(path));
    }
    if (rows.length < limit) break;
    offset += limit;
  }
  return out;
}

export async function POST(req: Request) {
  const auth = authorizeExternalRequest(req, 'lab:run');
  if (!auth.credential) return NextResponse.json(externalAuthError(auth, 'lab:run'), { status: 401 });
  if (auth.credential.role !== 'root_delegate') return NextResponse.json({ ok: false, error: 'root_delegate_required' }, { status: 403 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const operation = String(body.operation ?? 'inventory');
  const actorId = externalActor(auth.credential);
  const db = createServiceSupabaseClient();

  if (operation === 'inventory') {
    const files = await listFilesRecursively();
    const objects = await db.from('studio_objects').select('id,title,object_type,mime_type,size_bytes,source_uri,status,created_at');
    const uploads = await db.from('studio_uploads').select('id,object_id,storage_path,status,size_bytes,created_at');
    return NextResponse.json({
      ok: !objects.error && !uploads.error,
      operation,
      bucket: STUDIO_BUCKET,
      fileCount: files.length,
      files,
      studioObjects: objects.data ?? [],
      studioUploads: uploads.data ?? [],
      warnings: [objects.error?.message, uploads.error?.message].filter(Boolean),
    });
  }

  if (operation !== 'purge_studio_raw') return NextResponse.json({ ok: false, error: 'unsupported_maintenance_operation' }, { status: 400 });
  if (body.confirm !== 'PURGE_STUDIO_RAW') return NextResponse.json({ ok: false, error: 'explicit_confirmation_required', expected: 'PURGE_STUDIO_RAW' }, { status: 400 });

  const files = await listFilesRecursively();
  const removed: string[] = [];
  const failures: Array<{ path: string; error: string }> = [];
  for (let i = 0; i < files.length; i += 1000) {
    const batch = files.slice(i, i + 1000);
    const result = await db.storage.from(STUDIO_BUCKET).remove(batch);
    if (result.error) {
      for (const path of batch) failures.push({ path, error: result.error.message });
    } else {
      removed.push(...batch);
    }
  }

  if (!failures.length) {
    await db.from('studio_objects').update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    }).in('status', ['uploaded', 'analyzing', 'ready', 'blocked', 'failed']);
    await db.from('studio_uploads').update({ status: 'missing' }).neq('status', 'missing');
  }

  const trace = await appendOperationalEvent({
    eventName: 'SFI_RAW_STUDIO_STORAGE_PURGED',
    actorId,
    confidence: failures.length ? 0.5 : 1,
    payload: {
      bucket: STUDIO_BUCKET,
      storagePolicy: 'REFERENCE_ONLY',
      rawObjectPersistence: false,
      discoveredFiles: files.length,
      removedFiles: removed.length,
      failures,
      occurredAt: new Date().toISOString(),
    },
    lineage: [],
  });

  return NextResponse.json({
    ok: failures.length === 0,
    operation,
    bucket: STUDIO_BUCKET,
    discoveredFiles: files.length,
    removedFiles: removed.length,
    failures,
    trace: trace.ok ? trace.data : trace,
  }, { status: failures.length ? 207 : 200 });
}
