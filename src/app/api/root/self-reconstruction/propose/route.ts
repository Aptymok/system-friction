import { NextResponse } from 'next/server';
import { proposeSelfReconstruction } from '@/lib/root/selfReconstruction';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await proposeSelfReconstruction());
}

export async function POST() {
  return NextResponse.json(await proposeSelfReconstruction());
}

