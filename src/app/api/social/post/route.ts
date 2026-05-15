import { NextRequest, NextResponse } from "next/server";
import { handleEvent } from "@/lib/kernel/entrypoint";
import { assertEvent } from "@/lib/kernel/assertEvent";

export async function POST(req: NextRequest) {
  const body = await req.json();

  assertEvent("social_post");

  const result = await handleEvent(
    {
      type: "social_post",
      payload: body,
    },
    body.metrics || {}
  );

  return NextResponse.json(result);
}
