import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/runtime/supabase/server";
import { analyzeSfiLabInput } from "@/lib/sfi-psi/analyzer";
import type { SfiLabAnalyzeInput } from "@/lib/sfi-psi/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeInput(body: any): SfiLabAnalyzeInput & {
  case_id: string;
  scope: string;
  input_text: string;
} {
  const input_text =
    typeof body?.text === "string"
      ? body.text
      : typeof body?.input_text === "string"
        ? body.input_text
        : typeof body?.inputText === "string"
          ? body.inputText
          : typeof body?.content === "string"
            ? body.content
            : typeof body?.prompt === "string"
              ? body.prompt
              : "";

  const case_id =
    body?.case_id ||
    body?.caseId ||
    body?.caseID ||
    "SFI-OP-LOCAL";

  const scope =
    body?.scope ||
    body?.domain ||
    "culture";

  return {
    case_id,
    scope,
    input_text,
    text: input_text,
    source: typeof body?.source === "string" ? body.source : "sfi-lab",
    mode: body?.mode,
    file: body?.file ?? null,
    tags: Array.isArray(body?.tags) ? body.tags : [],
  };
}

export async function POST(req: NextRequest) {
  let normalized: ReturnType<typeof normalizeInput> | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    normalized = normalizeInput(body);

    const analysis = analyzeSfiLabInput({
      text: normalized.text,
      source: normalized.source,
      mode: normalized.mode,
      file: normalized.file,
      tags: normalized.tags,
    });

    let dataPlane;
    try {
      dataPlane = createServiceSupabaseClient();
    } catch (error) {
      return NextResponse.json({
        ...analysis,
        persisted: false,
        degraded: true,
        persistenceSource: "memory_fallback",
        persistenceReason: error instanceof Error ? error.message : "systemic_data_plane_client_unavailable",
      });
    }

    const { data: record, error } = await dataPlane
      .from("sfi_lab_analyses")
      .insert({
        case_id: normalized.case_id,
        scope: normalized.scope,
        input_text: normalized.input_text,
        result: analysis,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[sfi-lab] systemic data-plane persistence unavailable; returning analysis without persistence", error);

      return NextResponse.json({
        ...analysis,
        persisted: false,
        degraded: true,
        persistenceSource: "memory_fallback",
        data_plane_error: {
          code: error.code ?? null,
          message: error.message ?? String(error),
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
      });
    }

    return NextResponse.json({
      ...analysis,
      persisted: true,
      degraded: false,
      persistenceSource: "systemic_data_plane",
      record,
    });
  } catch (error: any) {
    console.error("[sfi-lab] fatal analyze error", error);

    const fallback = analyzeSfiLabInput({
      text: normalized?.text ?? "",
      source: normalized?.source ?? "sfi-lab-fatal-fallback",
      mode: normalized?.mode ?? "detect_signals",
      file: normalized?.file ?? null,
      tags: normalized?.tags ?? [],
    });

    return NextResponse.json(
      {
        ...fallback,
        persisted: false,
        degraded: true,
        persistenceSource: "fatal_fallback",
        error: error?.message ?? String(error),
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
    contract: "SfiLabAnalysis with persistence metadata",
  });
}
