import { NextResponse } from "next/server";

import { requireRootActor } from "@/lib/root/server";

import {
  executeCognitiveCycle
} from "@/lib/sfi/cognitive-runtime/cognitiveCycle";

import type {
  KernelContext
} from "@/lib/sfi/cognitive-runtime/kernelContext";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";


export async function POST(
  request: Request
) {

  const gate =
    await requireRootActor(
      "root.cognitive-runtime.run"
    );


  if (!gate.ok) {

    return NextResponse.json(
      gate.body,
      {
        status:
          gate.status
      }
    );

  }


  const body =
    await request.json()
      .catch(() => ({}));


  const context =
    body.context as KernelContext;


  if (!context) {

    return NextResponse.json(
      {
        ok:false,
        error:"missing_kernel_context"
      },
      {
        status:400
      }
    );

  }


  const result =
    await executeCognitiveCycle(
      context
    );


  return NextResponse.json(
    {
      ok:true,
      executedAgents:
        result.executedAgents,
      completed:
        result.completed,
      context:
        result.context
    },
    {
      headers:{
        "Cache-Control":"no-store"
      }
    }
  );

}