import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("node_bootstrap");

  const result = await handleEvent(
    {
      type: "node_bootstrap",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
