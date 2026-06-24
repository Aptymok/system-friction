import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePayload(body: any) {
  const case_id =
    body?.case_id ||
    body?.caseId ||
    body?.caseID ||
    "SFI-OP-LOCAL";

  const scope =
    body?.scope ||
    body?.domain ||
    "culture";

  const input_text =
    body?.input_text ||
    body?.inputText ||
    body?.text ||
    body?.content ||
    body?.prompt ||
    "";

  return { case_id, scope, input_text };
}

function analyzeLocally(input_text: string, scope: string) {
  const text = String(input_text || "");

  const tokens = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9_]+/i)
    .filter(Boolean);

  const unique = Array.from(new Set(tokens));

  const signalTerms = [
    "senal",
    "friccion",
    "persistencia",
    "archivo",
    "mundo",
    "cultura",
    "trayectoria",
    "vector",
    "ruido",
    "anomalia",
    "regimen",
    "observacion",
  ];

  const hits = unique.filter((t) => signalTerms.includes(t));

  return {
    scope,
    input_length: text.length,
    token_count: tokens.length,
    unique_token_count: unique.length,
    signal_hits: hits,
    signal_score: tokens.length
      ? Number((hits.length / signalTerms.length).toFixed(4))
      : 0,
    regime:
      hits.length >= 5
        ? "SIGNAL_DENSE"
        : hits.length >= 2
          ? "SIGNAL_PRESENT"
          : "LOW_SIGNAL",
    generated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { case_id, scope, input_text } = normalizePayload(body);
    const result = analyzeLocally(input_text, scope);

    const supabase = getSupabaseClient();

    if (!supabase) {
      return NextResponse.json({
        ok: true,
        persisted: false,
        degraded: true,
        source: "memory_fallback",
        reason: "supabase_client_unavailable",
        data: result,
      });
    }

    const { data, error } = await supabase
      .from("sfi_lab_analyses")
      .insert({
        case_id,
        scope,
        input_text,
        result,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[sfi-lab] supabase persistence unavailable; using local memory", error);

      return NextResponse.json({
        ok: true,
        persisted: false,
        degraded: true,
        source: "memory_fallback",
        supabase_error: {
          code: error.code ?? null,
          message: error.message ?? String(error),
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        data: result,
      });
    }

    return NextResponse.json({
      ok: true,
      persisted: true,
      degraded: false,
      source: "supabase",
      record: data,
      data: result,
    });
  } catch (error: any) {
    console.error("[sfi-lab] fatal analyze error", error);

    return NextResponse.json(
      {
        ok: false,
        persisted: false,
        degraded: true,
        source: "fatal_fallback",
        error: error?.message ?? String(error),
        data: null,
      },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/scorefriction/lab/analyze",
    status: "ready",
  });
}
