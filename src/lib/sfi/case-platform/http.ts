import { NextResponse } from 'next/server';
import { AccessDeniedError } from '@/lib/system/access/server';

export function sfiCaseApiFailure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = /FORBIDDEN/.test(details)
    ? 403
    : /NOT_FOUND/.test(details)
      ? 404
      : /INVALID|REQUIRED|UNKNOWN|MISMATCH|TRANSITION|CONFLICT/.test(details)
        ? 400
        : 500;
  return NextResponse.json({ ok: false, error: 'SFI_CASE_PLATFORM_FAILED', details }, { status });
}
