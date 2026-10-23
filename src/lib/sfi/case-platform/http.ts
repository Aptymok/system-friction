import { NextResponse } from 'next/server';
import { AccessDeniedError } from '@/lib/system/access/server';

export function sfiCaseApiFailure(error: unknown) {
  if (error instanceof AccessDeniedError) {
    return NextResponse.json({ ok: false, error: error.code, details: error.message }, { status: error.status });
  }
  const details = error instanceof Error ? error.message : String(error);
  const status = /SFI_CASE_TRANSITION_FORBIDDEN/.test(details) || /SFI_CASE_CLOSURE_BLOCKED|SFI_CASE_CLOSURE_REPORT_REQUIRED|SFI_CASE_TRANSITION_CONFLICT|SFI_CASE_READ_CONFLICT/.test(details)
    ? 409
    : /FORBIDDEN/.test(details)
      ? 403
      : /NOT_FOUND/.test(details)
        ? 404
        : /INVALID|REQUIRED|UNKNOWN|MISMATCH|TRANSITION|CONFLICT/.test(details)
          ? 400
          : 500;
  return NextResponse.json({ ok: false, error: 'SFI_CASE_PLATFORM_FAILED', details }, { status });
}
