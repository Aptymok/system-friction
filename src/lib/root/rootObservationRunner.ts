import 'server-only';
import { requireGovernedActor } from '@/lib/operational/common';
import { runAlertAgent, runDailyObservationAgent, runInternalReportAgent, runPersistenceAuditAgent, runPublicReportAgent } from '@/lib/world-vector/agents';

export type RootObservationJob = 'daily' | 'reports' | 'audit' | 'all';

export async function runRootObservationJob(job: RootObservationJob) {
  const gate = await requireGovernedActor('root.operational.observe');
  if (!gate.ok) return { ok: false as const, status: gate.status, body: gate.body };
  if (!gate.ctx.isRoot) return { ok: false as const, status: 403, body: { ok: false, error: 'root_required' } };

  const result: Record<string, unknown> = { ok: true, actor: gate.ctx.user.id, job, triggered_at: new Date().toISOString() };
  if (job === 'daily' || job === 'all') result.daily = await runDailyObservationAgent({ persist: true });
  if (job === 'reports' || job === 'all') {
    const internal = await runInternalReportAgent({ persist: true });
    const external = await runPublicReportAgent({ persist: true });
    result.reports = { internal, external };
  }
  if (job === 'audit' || job === 'all') {
    const persistence = await runPersistenceAuditAgent();
    const alerts = await runAlertAgent();
    result.audit = { persistence, alerts };
  }
  return { ok: true as const, status: 200, body: result };
}
