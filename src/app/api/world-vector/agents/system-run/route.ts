import { NextResponse } from 'next/server';
import { requireWorldVectorSystemActor } from '@/lib/world-vector/systemActorAuth';
import {
  runAlertAgent,
  runDailyObservationAgent,
  runInternalReportAgent,
  runPersistenceAuditAgent,
  runPublicReportAgent,
} from '@/lib/world-vector/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SystemRunJob = 'daily' | 'reports' | 'audit' | 'all';

function resolveJob(request: Request): SystemRunJob {
  const url = new URL(request.url);
  const job = url.searchParams.get('job');
  if (job === 'daily' || job === 'reports' || job === 'audit' || job === 'all') return job;
  return 'all';
}

export async function POST(request: Request) {
  const job = resolveJob(request);
  const gate = await requireWorldVectorSystemActor(job === 'all' ? 'daily' : job);
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const url = new URL(request.url);
  const persist = url.searchParams.get('persist') !== 'false';
  const result: Record<string, unknown> = {
    ok: true,
    actor: 'world-vector-system-agent',
    job,
    persist,
  };

  if (job === 'daily' || job === 'all') {
    result.daily = await runDailyObservationAgent({ persist });
  }

  if (job === 'reports' || job === 'all') {
    const internal = await runInternalReportAgent({ persist });
    const external = await runPublicReportAgent({ persist });
    result.reports = { internal, external };
  }

  if (job === 'audit' || job === 'all') {
    const persistence = await runPersistenceAuditAgent();
    const alerts = await runAlertAgent();
    result.audit = { persistence, alerts };
  }

  return NextResponse.json(result);
}
