import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { STUDIO_OBJECT_BUCKET, ensureStudioObjectBucket } from '@/lib/studio/multimodal/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };
type EvidenceBody = Record<string, unknown>;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanConfidence(value: unknown) {
  const parsed = cleanNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(1, parsed > 1 ? parsed / 100 : parsed));
}

function payloadFromBody(body: EvidenceBody, filePayload: Record<string, unknown> | null) {
  return {
    evidenceType: cleanText(body.evidenceType, 120) ?? 'operator_evidence',
    medium: filePayload ? 'file' : cleanText(body.medium, 80) ?? 'text',
    url: cleanText(body.url, 2000),
    text: cleanText(body.text, 5000),
    measurement: {
      variable: cleanText(body.variable, 160),
      value: cleanText(body.measurementValue, 300) ?? cleanNumber(body.measurementValue),
      unit: cleanText(body.unit, 80),
    },
    observedAt: cleanText(body.observedAt, 80),
    sourceName: cleanText(body.sourceName, 400),
    confidence: cleanConfidence(body.confidence),
    contextNote: cleanText(body.contextNote, 2000),
    related: {
      suggestionId: cleanText(body.suggestionId, 120),
      hypothesisId: cleanText(body.hypothesisId, 120),
      interventionId: cleanText(body.interventionId, 120),
      measurementId: cleanText(body.measurementId, 120),
    },
    file: filePayload,
    provenance: {
      source: 'studio_object_evidence_form',
      capturedAt: new Date().toISOString(),
      relation: 'object_id',
    },
  };
}

async function objectIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    const access = await requireObjectOwner(objectId);
    const contentType = request.headers.get('content-type') ?? '';
    let body: EvidenceBody = {};
    let filePayload: Record<string, unknown> | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (key !== 'file') body[key] = value instanceof File ? value.name : value;
      }
      const file = form.get('file');
      if (file instanceof File && file.size > 0) {
        const service = createServiceSupabaseClient();
        await ensureStudioObjectBucket(service);
        const safeName = file.name.replace(/[^a-z0-9._-]+/gi, '-').slice(0, 120) || 'evidence.bin';
        const storagePath = `studio/${access.user.id}/evidence/${objectId}/${Date.now()}-${randomUUID()}-${safeName}`;
        const bytes = Buffer.from(await file.arrayBuffer());
        const stored = await service.storage.from(STUDIO_OBJECT_BUCKET).upload(storagePath, bytes, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
        if (stored.error) throw stored.error;
        filePayload = {
          fileName: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
          storagePath,
        };
      }
    } else {
      body = await request.json().catch(() => ({})) as EvidenceBody;
    }

    const payload = payloadFromBody(body, filePayload);
    if (!payload.text && !payload.url && !payload.file && payload.measurement.value === null && payload.measurement.value === '') {
      return NextResponse.json({ ok: false, error: 'EVIDENCE_CONTENT_REQUIRED' }, { status: 400 });
    }

    const service = createServiceSupabaseClient();
    const inserted = await service
      .from('studio_evidence_traces')
      .insert({
        object_id: objectId,
        source: payload.sourceName ?? payload.evidenceType,
        label: cleanText(body.label, 240) ?? `${payload.evidenceType}:${payload.measurement.variable ?? payload.medium}`,
        payload,
      })
      .select('*')
      .single();
    if (inserted.error || !inserted.data) throw inserted.error ?? new Error('studio_evidence_insert_failed');

    await service.from('studio_archive_events').insert({
      session_id: null,
      object_id: objectId,
      event_type: 'evidence_added',
      label: `Evidence added: ${inserted.data.label}`,
      source: 'studio_object_evidence_form',
      payload: { evidenceTraceId: inserted.data.id, variable: payload.measurement.variable, provenance: payload.provenance },
    });

    return NextResponse.json({ ok: true, evidence: inserted.data }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'EVIDENCE_WRITE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
