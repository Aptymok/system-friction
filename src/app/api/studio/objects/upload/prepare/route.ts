import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: 'RAW_OBJECT_STORAGE_RETIRED',
    status: 'REFERENCE_ONLY',
    message: 'Signed raw uploads are retired. The client or external agent should hold/process the object and send only structured results to SFI.',
    executionContract: '/api/external/v1/execution-contract',
    structuredResult: '/api/external/v1/result',
  }, { status: 410 });
}
