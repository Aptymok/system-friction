import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/runtime/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Verificación de seguridad
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader.split(" ")[1] !== process.env.WORLDSPECT_INGEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // 2. Normalización Inteligente: El receptor acepta cualquier variante
    // Esto hace que tu API sea inmune a cambios de nombres de variables en el script de Python
    const wmacro = body.wsi ?? body.WSI ?? body.Wmacro ?? body.wmacro;
    const nti = body.nti ?? body.NTI;

    if (wmacro === undefined || nti === undefined) {
      return NextResponse.json(
        { 
          error: "Estructura inválida", 
          debug: "Se esperaban WSI/Wmacro y NTI",
          received_keys: Object.keys(body) 
        },
        { status: 400 }
      );
    }

    // 3. Inserción en Supabase
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase
      .from("worldspect_snapshots")
      .insert([{
        wmacro: Number(wmacro),
        nti: Number(nti),
        feeds_parsed: body.sources || [],
        observed_at: body.ts || new Date().toISOString(),
        payload: body
      }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}