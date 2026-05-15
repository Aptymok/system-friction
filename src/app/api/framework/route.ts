import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("framework_call");

  const result = await handleEvent(
    {
      type: "framework_call",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
