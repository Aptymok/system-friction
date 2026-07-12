import { NextResponse } from 'next/server';
import type { RootObservationJob } from '@/lib/root/rootObservationRunner';
import { requireRootActor } from '@/lib/root/server';

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
  const gate = await requireRootActor('root.operational.health');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  return NextResponse.json({ ok: true, route: 'root_operation_ready', default_job: DEFAULT_JOB, job: resolveJob(request) });
}

export async function POST(request: Request) {
  const gate = await requireRootActor('root.operational.observe');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });
  const mod = await import(RUNNER_PATH);
  const handler = mod[RUNNER_KEY] as (job: RootObservationJob) => Promise<{ status: number; body: unknown }>;
  const output = await handler(resolveJob(request));
  return NextResponse.json(output.body, { status: output.status });
}
