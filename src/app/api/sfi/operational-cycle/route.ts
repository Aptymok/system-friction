import { NextResponse } from 'next/server';
import { readSingleFromView } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await readSingleFromView('vw_sfi_operational_cycle');
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
