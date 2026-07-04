import { NextResponse } from 'next/server';
import type { RootObservationJob } from '@/lib/root/rootObservationRunner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_JOB: RootObservationJob = 'all';

export async function GET() {
  return NextResponse.json({ ok: true, route: 'root_operation_ready', default_job: DEFAULT_JOB });
}

export async function POST() {
  return NextResponse.json({ ok: false, blocked: true, reason: 'runtime_wiring_pending' }, { status: 200 });
}
