import { NextResponse } from 'next/server';
import { buildOperationalState } from '@/lib/operational/state';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildOperationalState());
}
