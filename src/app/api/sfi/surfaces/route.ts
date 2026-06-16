import { NextResponse } from 'next/server';
import { buildSfiSurfaceState } from '@/lib/navigation/sfiSurfaceState';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    surfaces: buildSfiSurfaceState(),
    generatedAt: new Date().toISOString(),
  });
}
