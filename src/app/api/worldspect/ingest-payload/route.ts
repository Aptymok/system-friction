import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Diagnósticos iniciales
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.WORLDSPECT_INGEST_SECRET;
    console.log('[worldspect/ingest] authHeaderExists=', !!authHeader, 'envSecretPresent=', !!secret);

    // 2. Verificación de Seguridad (no exponer el secreto en logs)
    if (!authHeader || authHeader.split(" ")[1] !== secret) {
      console.warn('[worldspect/ingest] Unauthorized request - missing/invalid Authorization header');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Recepción del Payload
    // Leer el cuerpo como bytes (evita que se consuman dos veces)
    let body: any;
    const ab = await request.arrayBuffer();
    const buf = Buffer.from(ab);
    // Intento UTF-8 primero
    try {
      const txtUtf8 = buf.toString('utf8');
      body = JSON.parse(txtUtf8);
      console.log('[worldspect/ingest] parsed body as utf8, size=', txtUtf8.length);
    } catch (utf8Err) {
      console.warn('[worldspect/ingest] UTF-8 parse failed, trying UTF-16 fallbacks:', utf8Err && utf8Err.message);
      let txt: string | null = null;
      let encodingDetected = 'unknown';
      if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        encodingDetected = 'utf16le_bom';
        console.log('[worldspect/ingest] Detected UTF-16 LE BOM');
        txt = buf.toString('utf16le');
      } else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
        encodingDetected = 'utf16be_bom';
        console.log('[worldspect/ingest] Detected UTF-16 BE BOM');
        txt = buf.toString('utf16be');
      } else {
        // Intentar interpretar como utf16le por heurística
        try {
          txt = buf.toString('utf16le');
          encodingDetected = 'utf16le_heuristic';
        } catch (_) {
          txt = buf.toString('utf8');
          encodingDetected = 'utf8_fallback';
        }
      }

      try {
        // Strip BOM if present
        const cleaned = (txt as string).replace(/^\uFEFF/, '');
        body = JSON.parse(cleaned);
        console.log('[worldspect/ingest] manual JSON parse success, size=', cleaned.length, 'encoding=', encodingDetected);
      } catch (manualErr) {
        console.error('[worldspect/ingest] manual JSON parse failed:', manualErr && (manualErr.stack || manualErr));
        const preview = buf.slice(0, 128).toString('hex');
        return NextResponse.json({ ok: false, stage: 'parse', error_code: 'JSON_PARSE_FAILED', encodingDetected, preview }, { status: 400 });
      }
    }

    // Normalización: mapeamos las variables de tu script de Python
    // a las columnas reales que existen en tu base de datos Supabase
    const wsi = body.wsi;
    const nti = body.nti;
    const sources = body.sources;
    const observed_at = body.ts;

    // Validación básica de integridad
    if (wsi === undefined || nti === undefined) {
      return NextResponse.json({ 
        error: "Estructura inválida: Esperaba wsi y nti", 
        received: Object.keys(body) 
      }, { status: 400 });
    }

    // 3. Persistencia con Rol de Servicio (Admin)
    const supabase = createServiceSupabaseClient();
    if (!supabase) {
      console.error('[worldspect/ingest] createServiceSupabaseClient() returned falsy');
      // Treat as supabase insertion stage failure
      const dumpDir = path.join(process.cwd(), 'dumps');
      let wrote = false;
      if (process.env.NODE_ENV !== 'production') {
        try {
          fs.mkdirSync(dumpDir, { recursive: true });
          const fname = `worldspect_dump_${Date.now()}.json`;
          fs.writeFileSync(path.join(dumpDir, fname), JSON.stringify({ received_at: new Date().toISOString(), body: body, note: 'no supabase client' }, null, 2));
          wrote = true;
        } catch (fsErr) {
          console.error('[worldspect/ingest] dump write failed', fsErr);
        }
      }
      return NextResponse.json({ ok: false, stage: 'supabase_insert', error_code: 'NO_SUPABASE_CLIENT', diagnostic_dump_written: wrote }, { status: 502 });
    }

    const { error } = await supabase
      .from("worldspect_snapshots")
      .insert([{
        wsi: Number(wsi),
        nti: Number(nti),
        sources: sources,
        observed_at: observed_at,
        raw_payload: body,
        ingest_mode: "cloud_automated",
        snapshot_hash: "v1_prod"
      }]);

    if (error) {
      console.error("Supabase Ingest Error:", error);
      // write diagnostic dump when not in production
      const dumpDir = path.join(process.cwd(), 'dumps');
      let wrote = false;
      if (process.env.NODE_ENV !== 'production') {
        try {
          fs.mkdirSync(dumpDir, { recursive: true });
          const fname = `worldspect_dump_${Date.now()}.json`;
          fs.writeFileSync(path.join(dumpDir, fname), JSON.stringify({ received_at: new Date().toISOString(), body: body, supabase_error: error }, null, 2));
          wrote = true;
        } catch (fsErr) {
          console.error('[worldspect/ingest] dump write failed', fsErr);
        }
      }
      // Extract short error code if possible
      const errorCode = (error && (error.message || error.error || error.name)) ? String(error.message || error.error || error.name) : 'SUPABASE_INSERT_FAILED';
      return NextResponse.json({ ok: false, stage: 'supabase_insert', error_code: errorCode, diagnostic_dump_written: wrote }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[worldspect/ingest] Exception:', err && (err.stack || err));
    return NextResponse.json({ error: String(err && err.message) || 'unknown error' }, { status: 500 });
  }
}