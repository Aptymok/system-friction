import { NextResponse } from 'next/server';
import { listFieldCycles } from '@/lib/field/operationalCycle';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Row = Record<string, unknown>;

type GeoPrecision = 'exact_point' | 'neighborhood' | 'city' | 'metropolitan_area' | 'state' | 'country';

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 180) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function number(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: unknown, fallback = 0.5) {
  const parsed = number(value);
  return parsed === null ? fallback : Math.max(0, Math.min(1, parsed));
}

function precision(value: unknown): GeoPrecision {
  const candidate = text(value, 40);
  return candidate === 'exact_point'
    || candidate === 'neighborhood'
    || candidate === 'metropolitan_area'
    || candidate === 'state'
    || candidate === 'country'
    ? candidate
    : 'city';
}

function failure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = /REQUIRED|INVALID|OUT_OF_RANGE/.test(details) ? 400 : /NOT_FOUND/.test(details) ? 404 : 500;
  return NextResponse.json({ ok: false, error: 'FIELD_MAP_FAILED', details }, { status });
}

function normalizeCase(value: unknown) {
  const row = record(value);
  const metadata = record(row.metadata);
  const geo = record(metadata.geo);
  const lat = number(geo.lat);
  const lng = number(geo.lng);
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
  return {
    id: text(row.id, 80),
    title: text(row.title, 240) || 'FIELD CASE',
    domain: text(row.domain, 80) || 'unknown',
    status: text(row.status, 80) || 'UNKNOWN',
    verificationWindow: text(row.verification_window, 40) || 'unknown',
    createdAt: text(row.created_at, 80),
    evidenceCount: evidence.length,
    geo: lat !== null && lng !== null ? {
      lat,
      lng,
      countryCode: text(geo.countryCode, 3).toUpperCase(),
      country: text(geo.country, 100),
      admin1: text(geo.admin1, 100),
      city: text(geo.city, 120),
      label: text(geo.label, 180),
      precision: precision(geo.precision),
      confidence: clamp01(geo.confidence, 0.5),
      source: text(geo.source, 100) || 'operator_declared',
      observedAt: text(geo.observedAt, 80) || text(row.created_at, 80),
    } : null,
  };
}

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const result = await listFieldCycles(user.id);
    const cases = (result.cases ?? []).map(normalizeCase);
    const located = cases.filter((item) => item.geo !== null);
    return NextResponse.json({
      ok: true,
      sourceState: 'persisted_field_cases',
      generatedAt: new Date().toISOString(),
      cases,
      summary: {
        total: cases.length,
        located: located.length,
        unlocated: cases.length - located.length,
        evidence: cases.reduce((sum, item) => sum + item.evidenceCount, 0),
        countries: new Set(located.map((item) => item.geo?.countryCode).filter(Boolean)).size,
      },
      limits: [
        'Only cases with explicitly persisted geographic metadata are plotted.',
        'An empty region means no located FIELD observation, not absence of friction.',
        'Coordinates are never inferred from free text.',
      ],
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = record(await request.json().catch(() => null));
    const caseId = text(body.caseId, 80);
    if (!caseId) throw new Error('CASE_ID_REQUIRED');
    const lat = number(body.lat);
    const lng = number(body.lng);
    if (lat === null || lng === null) throw new Error('COORDINATES_REQUIRED');
    if (lat < -90 || lat > 90) throw new Error('LATITUDE_OUT_OF_RANGE');
    if (lng < -180 || lng > 180) throw new Error('LONGITUDE_OUT_OF_RANGE');

    const service = createServiceSupabaseClient();
    const current = await service
      .from('field_cases')
      .select('id,metadata')
      .eq('id', caseId)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (current.error) throw new Error(`FIELD_CASE_GEO_READ_FAILED:${current.error.message}`);
    if (!current.data) throw new Error('FIELD_CASE_NOT_FOUND');

    const metadata = record(current.data.metadata);
    const geo = {
      lat,
      lng,
      countryCode: text(body.countryCode, 3).toUpperCase(),
      country: text(body.country, 100),
      admin1: text(body.admin1, 100),
      city: text(body.city, 120),
      label: text(body.label, 180),
      precision: precision(body.precision),
      confidence: clamp01(body.confidence, 0.7),
      source: 'operator_declared',
      observedAt: new Date().toISOString(),
    };

    const updated = await service
      .from('field_cases')
      .update({ metadata: { ...metadata, geo } })
      .eq('id', caseId)
      .eq('owner_id', user.id)
      .select('id,metadata')
      .single();
    if (updated.error) throw new Error(`FIELD_CASE_GEO_WRITE_FAILED:${updated.error.message}`);

    return NextResponse.json({ ok: true, caseId, geo });
  } catch (error) {
    return failure(error);
  }
}
