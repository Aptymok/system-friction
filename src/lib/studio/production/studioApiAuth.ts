import 'server-only';

import { NextResponse } from 'next/server';
import { AccessDeniedError } from '@/lib/system/access/server';

export function studioApiAccessError(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json(
      { ok: false, error: error.code, details: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'STUDIO_ACCESS_FAILED',
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}
