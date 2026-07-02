import { NextResponse } from 'next/server';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { writePublicRuntimeSnapshot } from '@/lib/sfi/publicRuntimeSnapshot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const expected = process.env.SFI_PUBLIC_RUNTIME_CRON_SECRET || process.env.CRON_SECRET;
  if (!expected) return true;
  const header = request.headers.get('authorization') ?? '';
  return header === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const state = await buildSfiWorldInterfaceState();
  const warnings = Array.isArray(state.warnings) ? state.warnings : [];

  const result = await writePublicRuntimeSnapshot(
    'home',
    {
      state,
      map: {
        generatedAt: state.generatedAt,
        nodeCount: state.nodes.length,
        connectionCount: state.connections.length,
        warnings,
      },
    },
    warnings,
    3600,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    snapshotKey: 'home',
    generatedAt: state.generatedAt,
    nodes: state.nodes.length,
    connections: state.connections.length,
    warnings,
    result: result.data,
  });
}