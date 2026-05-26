import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de Seguridad
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.WORLDSPECT_INGEST_SECRET;

    if (!authHeader || authHeader.split(" ")[1] !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Recepción del Payload
    const body = await request.json();
    
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}