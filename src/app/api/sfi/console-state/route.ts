import { NextResponse } from 'next/server';
import { readOperationalConsoleState } from '@/lib/sfi/operationalConsole';

export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await readOperationalConsoleState();
  return NextResponse.json(state);
}
