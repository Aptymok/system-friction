import { NextResponse } from 'next/server';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await buildWorldVectorOperationalState();
  return NextResponse.json({
    ok: true,
    mode: 'read_only',
    data: state,
  });
}
