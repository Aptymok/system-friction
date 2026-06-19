import { NextResponse } from 'next/server';
import { readListFromView } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await readListFromView('vw_sfi_attractor_alignment_queue', 50);
  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
