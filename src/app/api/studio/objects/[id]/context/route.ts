import { NextResponse } from 'next/server';
import { AccessDeniedError, requireObjectOwner } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type RouteContext = { params: Promise<{ id: string }> | { id: string } };
type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function cleanList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item, 240)).filter((item): item is string => Boolean(item)).slice(0, 12);
  if (typeof value === 'string') return value.split(/[,;\n]+/).map((item) => cleanText(item, 240)).filter((item): item is string => Boolean(item)).slice(0, 12);
  return [];
}

async function objectIdFrom(ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  return decodeURIComponent(params.id);
}

export async function GET(_request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const service = createServiceSupabaseClient();
    const result = await service.from('studio_objects').select('metadata').eq('id', objectId).maybeSingle();
    if (result.error || !result.data) return NextResponse.json({ ok: false, error: 'OBJECT_NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true, context: record(result.data.metadata).context ?? {} });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'CONTEXT_READ_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: RouteContext) {
  const objectId = await objectIdFrom(ctx);
  try {
    await requireObjectOwner(objectId);
    const body = await request.json().catch(() => null) as Row | null;
    if (!body) return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
    const context = {
      declaredAttractor: cleanText(body.declaredAttractor, 1200),
      desiredShift: cleanText(body.desiredShift, 1200),
      targetAudience: cleanText(body.targetAudience, 600),
      prohibitedEffects: cleanList(body.prohibitedEffects),
      updatedAt: new Date().toISOString(),
    };
    const service = createServiceSupabaseClient();
    const current = await service.from('studio_objects').select('metadata').eq('id', objectId).maybeSingle();
    if (current.error || !current.data) return NextResponse.json({ ok: false, error: 'OBJECT_NOT_FOUND' }, { status: 404 });
    const metadata = record(current.data.metadata);
    const updated = await service
      .from('studio_objects')
      .update({ metadata: { ...metadata, context }, updated_at: new Date().toISOString() })
      .eq('id', objectId);
    if (updated.error) throw updated.error;
    return NextResponse.json({ ok: true, objectId, context });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: 'CONTEXT_UPDATE_FAILED', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
