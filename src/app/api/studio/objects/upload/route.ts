import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: 'RAW_OBJECT_STORAGE_RETIRED',
    status: 'REFERENCE_ONLY',
    message: 'SFI no longer stores raw Studio objects by default. Process the object in the client/agent, request /api/external/v1/execution-contract, then return structured results to /api/external/v1/result.',
    preferredFlow: [
      '/api/external/v1/execution-contract',
      'client_or_agent_processing',
      '/api/external/v1/result',
      'return_contrast_calibration',
    ],
  }, { status: 410 });
}
