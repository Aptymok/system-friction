import { NextRequest, NextResponse } from 'next/server';
import { buildRootNeuralGraphLive } from '@/lib/root/neuralGraphLive';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const gate = await requireRootActor('neural-graph.live.read');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const caseId = request.nextUrl.searchParams.get('case_id') ?? 'SFI-OP-LOCAL';
  return NextResponse.json(await buildRootNeuralGraphLive(caseId));
}
