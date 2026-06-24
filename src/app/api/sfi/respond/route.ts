import { NextResponse } from 'next/server';
import { generateSfiOperationalResponse } from '@/lib/sfi/responseEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await generateSfiOperationalResponse();
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      generated_at: new Date().toISOString(),
      source: 'sfi_response_engine',
      error: error instanceof Error ? error.message : 'sfi_response_failed',
    }, { status: 200 });
  }
}
