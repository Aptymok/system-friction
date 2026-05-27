import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'idle',
    service: 'sfi-runtime',
    checkedAt: new Date().toISOString(),
    metrics: {
      cycles: 0,
      failures: 0,
    },
  });
}
