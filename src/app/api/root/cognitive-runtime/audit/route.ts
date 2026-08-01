import { NextResponse } from "next/server";

import { requireRootActor } from "@/lib/root/server";

import {
  runRuntimeActivationAudit,
} from "@/lib/sfi/cognitive-runtime/runtimeActivationAudit";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function GET() {

  const gate =
    await requireRootActor(
      "root.cognitive-runtime.read"
    );


  if (!gate.ok) {
    return NextResponse.json(
      gate.body,
      {
        status: gate.status
      }
    );
  }


  return NextResponse.json(
    {
      ok: true,
      audit:
        runRuntimeActivationAudit(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}