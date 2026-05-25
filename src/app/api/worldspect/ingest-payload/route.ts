import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/runtime/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. CONTROL PERIMETRAL: Verificación del Token Secreto que subiste a Vercel
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.WORLDSPECT_INGEST_SECRET;

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== expectedToken) {
      return NextResponse.json(
        { error: "Gobernanza SFI: Acceso denegado. Token Primario inválido o ausente." },
        { status: 401 }
      );
    }

    // 2. RECEPCIÓN DEL PAYLOAD: Leer los datos calculados por GitHub Actions
    const body = await request.json();
    const { payload } = body as { payload?: Record<string, unknown> };

    if (!payload || !payload.Wmacro || !payload.NTI) {
      return NextResponse.json(
        { error: "Estructura inválida: Faltan índices macro geopolíticos (Wmacro, NTI)." },
        { status: 400 }
      );
    }

    // 3. PERSISTENCIA ATÓMICA: Guardar en la tabla oficial de Supabase usando el Service Role
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("worldspect_snapshots")
      .insert([
        {
          wmacro: payload.Wmacro,
          nti: payload.NTI,
          feeds_parsed: payload.feeds_parsed || [],
          observed_at: new Date().toISOString(),
          payload: payload,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: "Supabase Error: " + error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, snapshot_id: data?.[0]?.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Fault: " + err.message }, { status: 500 });
  }
}
