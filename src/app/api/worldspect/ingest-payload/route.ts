import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { WorldSpectIngestMode } from '../../../../../packages/api-contracts/src';
import {
  buildWorldSpectResponse,
  finiteNumberOrNull,
  toStringArray,
  toWorldSpectSources,
} from '@/lib/worldspect/contract';
import { recordWorldSpectLogbook } from '@/lib/worldspect/logbook';
import { upsertWorldSpectSnapshot } from '@/lib/worldspect/snapshotStore';

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
  return finiteNumberOrNull(value);
}

function isoDateOnly(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function ingestModeFromRequest(request: NextRequest): WorldSpectIngestMode {
  const header = request.headers.get('X-SFI-Ingest-Mode')?.trim();
  if (header === 'daily_cron' || header === 'manual' || header === 'diagnostic') return header;
  return 'daily_cron';
}

function adapterStatusFor(body: WorldSpectPayload, degradedSources: string[], sources: ReturnType<typeof toWorldSpectSources>) {
  if (typeof body.adapter_error === 'string' && body.adapter_error.length > 0) return 'failed' as const;
  if (degradedSources.length > 0 || sources.some((source) => source.error || source.simulated === true)) return 'degraded' as const;
  return 'observed' as const;
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
    const observedDate = isoDateOnly(observedAt);
    const degradedSources = toStringArray(body.degraded_sources);
    const sources = toWorldSpectSources(body.sources);
    const ingestMode = ingestModeFromRequest(request);
    const response = buildWorldSpectResponse({
      wsi,
      nti,
      ts: observedAt,
      sources,
      degraded_sources: degradedSources,
      source_health: body.source_health,
      field_state_signal: body.field_state_signal,
      adapter_error: body.adapter_error,
    });

    if (response.sourceState === 'missing') {
      return NextResponse.json(
        {
          ok: false,
          stage: 'validate',
          error_code: 'MISSING_PAYLOAD',
          error_message: 'Expected valid WorldSpect metrics or sources',
        },
        { status: 400 },
      );
    }

    const persisted = await upsertWorldSpectSnapshot({
      sourceState: response.sourceState,
      evidenceLevel: 'direct',
      confidence: response.confidence,
      wsi: response.wsi,
      nti: response.nti,
      ts: response.ts,
      sources: response.sources,
      degraded_sources: response.degraded_sources,
      sourceHealth: response.sourceHealth,
      fieldStateSignal: response.fieldStateSignal,
      rawPayload: body,
      adapterStatus: adapterStatusFor(body, degradedSources, sources),
      adapterError: typeof body.adapter_error === 'string' ? body.adapter_error : null,
      ingestMode,
    });

    if (!persisted.ok) {
      console.error('Supabase Ingest Error:', persisted);
      const wrote = writeDiagnosticDump(body, { supabase_error: persisted });
      return NextResponse.json(
        {
          ok: false,
          stage: 'supabase_insert',
          error_code: normalizeSupabaseError(persisted),
          diagnostic_dump_written: wrote,
        },
        { status: 502 },
      );
    }

    const snapshotRef = {
      id: typeof persisted.data?.id === 'string' ? persisted.data.id : '',
      snapshot_hash: typeof persisted.data?.snapshot_hash === 'string' ? persisted.data.snapshot_hash : '',
      observed_at: typeof persisted.data?.observed_at === 'string' ? persisted.data.observed_at : observedAt,
    };
    const logbook = await recordWorldSpectLogbook({
      response,
      snapshot: snapshotRef,
      ingestMode,
    });

    if (!logbook.ok) {
      console.error('WorldSpect Logbook Error:', logbook);
      const wrote = writeDiagnosticDump(body, { logbook_error: logbook });
      return NextResponse.json(
        {
          ok: false,
          stage: logbook.stage,
          error_code: logbook.error,
          diagnostic_dump_written: wrote,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      observed_date: observedDate,
      snapshot_hash: snapshotRef.snapshot_hash || null,
      sourceState: response.sourceState,
      ingestMode,
      logbook: {
        epistemic_events: 1,
        logbook_signals: logbook.signalCount,
        logbook_regime: logbook.regimeCount,
      },
    });
  } catch (err: unknown) {
    console.error('[worldspect/ingest] Exception:', errorStack(err));
    return NextResponse.json(
      { ok: false, stage: 'exception', error: errorMessage(err) || 'unknown error' },
      { status: 500 },
    );
  }
}
