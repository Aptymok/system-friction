import { NextRequest, NextResponse } from "next/server";
import { createKernelContext } from "@/lib/sfi/cognitive-runtime/createKernelContext";
import { executeSfiRuntime } from "@/lib/sfi/cognitive-runtime/runtime";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {

  await request.json().catch(() => ({}));

  const cycleId = crypto.randomUUID();
  const logbookId = crypto.randomUUID();

  const context = createKernelContext(
    cycleId,
    logbookId,
    "SFI_TASK_CREATED"
  );

  const result = await executeSfiRuntime(
    context
  );

  return NextResponse.json({

    ok: true,

    logbookId,

    cycleId,

    executedAgents:
      result.executedAgents,

    metadata:
      result.context.metadata

  });

}