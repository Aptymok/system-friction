import { NextRequest, NextResponse } from 'next/server';
import { buildRootNeuralGraphLive } from '@/lib/root/neuralGraphLive';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const caseId = request.nextUrl.searchParams.get('case_id') ?? 'SFI-OP-LOCAL';
  return NextResponse.json(await buildRootNeuralGraphLive(caseId));
}

