import { NextRequest, NextResponse } from 'next/server';
import { registerSelfReconstructionPatch } from '@/lib/root/selfReconstruction';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json(await registerSelfReconstructionPatch(body));
}

