import { NextResponse } from 'next/server';
import type { RootObservationJob } from '@/lib/root/rootObservationRunner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_JOB: RootObservationJob = 'all';
const RUNNER_PATH = '@/lib/root/rootObservationRunner';
const RUNNER_KEY = 'runRootObservationJob';

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
  const mod = await import(RUNNER_PATH);
  const handler = mod[RUNNER_KEY] as (job: RootObservationJob) => Promise<{ status: number; body: unknown }>;
  const output = await handler(resolveJob(request));
  return NextResponse.json(output.body, { status: output.status });
}
