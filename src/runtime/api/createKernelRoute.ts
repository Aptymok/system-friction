import { NextRequest, NextResponse } from "next/server";
import { assertEvent } from "@/runtime/kernel/assertEvent";
import { handleEvent } from "@/runtime/kernel/entrypoint";

export function createKernelRoute(type: string) {
  return async function POST(req: NextRequest) {
    const body = await req.json();

    assertEvent(type);

    const result = await handleEvent(
      {
        type,
        payload: body,
      },
      body.metrics || {}
    );

    return NextResponse.json(result);
  };
}
