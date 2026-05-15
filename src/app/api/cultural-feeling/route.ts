import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("cultural_feeling_query");

  const result = await handleEvent(
    {
      type: "cultural_feeling_query",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
