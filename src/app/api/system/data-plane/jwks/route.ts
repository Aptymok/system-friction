import { NextResponse } from 'next/server';
import { getSfiDataPlaneJwks } from '@/lib/persistence/dataPlaneIdentity';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(getSfiDataPlaneJwks(), {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
      },
    });
  } catch {
    return NextResponse.json({ error: 'data_plane_identity_unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
