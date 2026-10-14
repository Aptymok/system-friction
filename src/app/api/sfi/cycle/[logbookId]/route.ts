import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  streamEpistemicEvents
} from "@/lib/events/eventStore";


export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      logbookId: string;
    }>;
  }
) {

  const {
    logbookId
  } = await context.params;


  const result =
    await streamEpistemicEvents(
      logbookId
    );


  return NextResponse.json({

    ok: result.ok,

    logbookId,

    data:
      result.data,
    ...(result.ok ? {} : { error: 'epistemic_event_stream_failed' })

  }, { status: result.ok ? 200 : 503 });

}