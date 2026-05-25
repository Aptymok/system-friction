import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/runtime/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Control perimetral mediante el Token Secreto
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.WORLDSPECT_INGEST_SECRET;

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== expectedToken) {
      return NextResponse.json(
        { error: "Gobernanza SFI: Acceso denegado. Token Primario inválido o ausente." },
        { status: 401 }
      );
    }

    // 2. Extracción y validación del Payload de GitHub
    const body = await request.json();
    
    // Validamos que contenga la estructura necesaria
    if (!body || typeof body.Wmacro === 'undefined' || typeof body.NTI === 'undefined') {
      return NextResponse.json(
        { error: "Estructura corrupta: Faltan índices geopolíticos (Wmacro, NTI)." },
        { status: 400 }
      );
    }

    // 3. Persistencia atómica en la tabla oficial worldspect_snapshots
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("worldspect_snapshots")
      .insert([
        {
          wmacro: body.Wmacro,
          nti: body.NTI,
          feeds_parsed: body.feeds_parsed || [],
          observed_at: new Date().toISOString(),
          payload: body
        }
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: "Supabase Write Fault: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot_id: data[0].id }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Fault: " + err.message }, { status: 500 });
  }
}