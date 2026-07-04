import 'server-only';
import { NextResponse } from 'next/server';
import { runRootObservationJob, type RootObservationJob } from './rootObservationRunner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_JOB: RootObservationJob = 'all';

function resolveJob(request: Request): RootObservationJob {
  const url = new URL(request.url);
  const job = url.searchParams.get('job');
  if (job === 'daily' || job === 'reports' || job === 'audit' || job === 'all') return job;
  return DEFAULT_JOB;
}

export async function GET(request: Request) {
  return NextResponse.json({ ok: true, route: 'root_operation_ready', default_job: DEFAULT_JOB, job: resolveJob(request) });
}

export async function POST(request: Request) {
  const output = await runRootObservationJob(resolveJob(request));
  return NextResponse.json(output.body, { status: output.status });
}
