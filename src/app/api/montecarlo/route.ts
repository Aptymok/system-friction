import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("montecarlo_run");

  const result = await handleEvent(
    {
      type: "montecarlo_run",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
