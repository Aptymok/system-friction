import { NextResponse } from 'next/server';
import { requireRootViewer } from '@/lib/root/server';
import { readDiscoveryControlPlane } from '@/lib/discovery/discoveryControlPlane';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const gate = await requireRootViewer('root.discovery.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  try {
    const controlPlane = await readDiscoveryControlPlane();
    return NextResponse.json({
      ok: true,
      authority: gate.ctx.isRoot ? 'ROOT' : 'ROOT_OBSERVER',
      controlPlane,
    }, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: 'discovery_control_plane_unavailable',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 503 });
  }
}
