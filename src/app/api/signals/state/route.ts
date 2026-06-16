import { NextResponse } from 'next/server';
import { buildPersistentSignalState } from '@/lib/signals/persistentSignalInstrument';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await buildPersistentSignalState();
  return NextResponse.json(result);
}
