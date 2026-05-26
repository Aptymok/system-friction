import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';

type WorldSpectPayload = {
  wsi?: unknown;
  nti?: unknown;
  ts?: unknown;
  sources?: unknown;
  source_health?: unknown;
  degraded_sources?: unknown;
  field_state_signal?: unknown;
  adapter_error?: unknown;
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function errorStack(err: unknown): string {
  return err instanceof Error ? err.stack ?? err.message : String(err);
}

function decodeUtf16Be(buffer: Buffer): string {
  const data = buffer.slice(2);

  if (data.length % 2 !== 0) {
    throw new Error('UTF-16 BE buffer contains an odd number of bytes');
  }

  const swapped = Buffer.allocUnsafe(data.length);

  for (let i = 0; i < data.length; i += 2) {
    swapped[i] = data[i + 1];
    swapped[i + 1] = data[i];
  }

  return swapped.toString('utf16le');
}

function normalizeSupabaseError(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return String(error ?? 'SUPABASE_INSERT_FAILED');
  }

  const maybe = error as Record<string, unknown>;

  return String(
    maybe.message
      ?? maybe.details
      ?? maybe.hint
      ?? maybe.code
      ?? maybe.name
      ?? 'SUPABASE_INSERT_FAILED',
  );
}

function writeDiagnosticDump(body: unknown, extra: Record<string, unknown>): boolean {
  if (process.env.NODE_ENV === 'production') return false;

  try {
    const dumpDir = path.join(process.cwd(), 'dumps');
    fs.mkdirSync(dumpDir, { recursive: true });
    const fname = `worldspect_dump_${Date.now()}.json`;
    fs.writeFileSync(
      path.join(dumpDir, fname),
      JSON.stringify(
        {
          received_at: new Date().toISOString(),
          body,
          ...extra,
        },
        null,
        2,
      ),
    );

    return true;
  } catch (fsErr) {
    console.error('[worldspect/ingest] dump write failed', fsErr);
    return false;
  }
}

function parsePayloadFromBuffer(buf: Buffer): { body: WorldSpectPayload; encodingDetected: string } {
  try {
    const txtUtf8 = buf.toString('utf8');
    const parsed = JSON.parse(txtUtf8) as WorldSpectPayload;
    console.log('[worldspect/ingest] parsed body as utf8, size=', txtUtf8.length);
    return { body: parsed, encodingDetected: 'utf8' };
  } catch (utf8Err) {
    console.warn(
      '[worldspect/ingest] UTF-8 parse failed, trying UTF-16 fallbacks:',
      errorMessage(utf8Err),
    );
  }

  let txt: string;
  let encodingDetected = 'unknown';

  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    encodingDetected = 'utf16le_bom';
    console.log('[worldspect/ingest] Detected UTF-16 LE BOM');
    txt = buf.toString('utf16le');
  } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    encodingDetected = 'utf16be_bom';
    console.log('[worldspect/ingest] Detected UTF-16 BE BOM');
    txt = decodeUtf16Be(buf);
  } else {
    encodingDetected = 'utf16le_heuristic';
    txt = buf.toString('utf16le');
  }

  const cleaned = txt.replace(/^\uFEFF/, '');
  const body = JSON.parse(cleaned) as WorldSpectPayload;
  console.log(
    '[worldspect/ingest] manual JSON parse success, size=',
    cleaned.length,
    'encoding=',
    encodingDetected,
  );

  return { body, encodingDetected };
}

function toFiniteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toJsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isoDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  let body: WorldSpectPayload | null = null;

  try {
    const authHeader = request.headers.get('Authorization');
    const secret = process.env.WORLDSPECT_INGEST_SECRET;

    console.log(
      '[worldspect/ingest] authHeaderExists=',
      !!authHeader,
      'envSecretPresent=',
      !!secret,
    );

    if (!authHeader || authHeader.split(' ')[1] !== secret) {
      console.warn('[worldspect/ingest] Unauthorized request - missing/invalid Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ab = await request.arrayBuffer();
    const buf = Buffer.from(ab);
    let encodingDetected = 'unknown';

    try {
      const parsed = parsePayloadFromBuffer(buf);
      body = parsed.body;
      encodingDetected = parsed.encodingDetected;
    } catch (parseErr) {
      console.error('[worldspect/ingest] JSON parse failed:', errorStack(parseErr));
      const preview = buf.slice(0, 128).toString('hex');
      return NextResponse.json(
        {
          ok: false,
          stage: 'parse',
          error_code: 'JSON_PARSE_FAILED',
          error_message: errorMessage(parseErr),
          encodingDetected,
          preview,
        },
        { status: 400 },
      );
    }

    const wsi = toFiniteNumber(body.wsi);
    const nti = toFiniteNumber(body.nti);

    if (wsi === null || nti === null) {
      return NextResponse.json(
        {
          ok: false,
          stage: 'validate',
          error_code: 'INVALID_PAYLOAD_SHAPE',
          error_message: 'Expected finite numeric wsi and nti values',
          received: Object.keys(body),
        },
        { status: 400 },
      );
    }

    const observedAt = typeof body.ts === 'string' && body.ts.trim().length > 0
      ? new Date(body.ts).toISOString()
      : new Date().toISOString();
    const uniqueDate = isoDateOnly(observedAt);
    const degradedSources = toJsonArray(body.degraded_sources);
    const sources = toJsonArray(body.sources);
    const sourceHealth = toJsonArray(body.source_health);
    const confidence = Math.max(0, Math.min(1, nti));
    const snapshotHash = createHash('sha256')
      .update(JSON.stringify({ uniqueDate, wsi, nti, sources, sourceHealth, degradedSources }))
      .digest('hex');

    const supabase = createServiceSupabaseClient();

    if (!supabase) {
      console.error('[worldspect/ingest] createServiceSupabaseClient() returned falsy');
      const wrote = writeDiagnosticDump(body, { note: 'no supabase client' });
      return NextResponse.json(
        {
          ok: false,
          stage: 'supabase_insert',
          error_code: 'NO_SUPABASE_CLIENT',
          diagnostic_dump_written: wrote,
        },
        { status: 502 },
      );
    }

    const row = {
      wsi,
      nti,
      source_state: degradedSources.length > 0 ? 'degraded' : 'observed',
      evidence_level: 'observed',
      confidence,
      degraded_sources: degradedSources,
      sources,
      source_health: sourceHealth,
      raw_payload: body,
      field_state_signal: body.field_state_signal ?? null,
      observed_at: observedAt,
      created_at: new Date().toISOString(),
      adapter_status: degradedSources.length > 0 ? 'degraded' : 'ok',
      adapter_error: typeof body.adapter_error === 'string' ? body.adapter_error : null,
      ingest_mode: 'manual',
      snapshot_hash: snapshotHash,
      unique_date: uniqueDate,
    };

    const { error } = await supabase
      .from('worldspect_snapshots')
      .upsert([row], { onConflict: 'unique_date' });

    if (error) {
      console.error('Supabase Ingest Error:', error);
      const wrote = writeDiagnosticDump(body, { supabase_error: error });
      return NextResponse.json(
        {
          ok: false,
          stage: 'supabase_insert',
          error_code: normalizeSupabaseError(error),
          diagnostic_dump_written: wrote,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, unique_date: uniqueDate, snapshot_hash: snapshotHash });
  } catch (err: unknown) {
    console.error('[worldspect/ingest] Exception:', errorStack(err));
    return NextResponse.json(
      { ok: false, stage: 'exception', error: errorMessage(err) || 'unknown error' },
      { status: 500 },
    );
  }
}
