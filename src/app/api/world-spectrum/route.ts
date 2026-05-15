import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("world_spectrum");

  const result = await handleEvent(
    {
      type: "world_spectrum",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
