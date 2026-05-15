import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("action_verify");

  const result = await handleEvent(
    {
      type: "action_verify",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
