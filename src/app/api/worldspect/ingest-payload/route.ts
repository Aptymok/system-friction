import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/runtime/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader.split(" ")[1] !== process.env.WORLDSPECT_INGEST_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Normalización directa basada en tu JSON de Python
    const wsi = body.wsi;
    const nti = body.nti;
    const sources = body.sources;
    const observed_at = body.ts;

    if (wsi === undefined || nti === undefined) {
      return NextResponse.json({ 
        error: "Estructura inválida", 
        received: Object.keys(body) 
      }, { status: 400 });
    }

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}