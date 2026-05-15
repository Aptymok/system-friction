import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("amv_answer");

  const result = await handleEvent(
    {
      type: "amv_answer",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
