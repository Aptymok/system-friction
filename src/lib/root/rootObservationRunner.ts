import 'server-only';

import { requireGovernedActor } from '@/lib/operational/common';
import { buildSfiWorldInterfaceState } from '@/lib/sfi/worldInterfaceState';
import { persistIndicatorSnapshot } from '@/lib/sfi/indicatorSnapshot';
import { buildWorldVectorOperationalState } from '@/lib/world-vector/operationalState';
import { runInstitutionalCycle } from '@/lib/institution/institutionalCycle';
import {
  runAlertAgent,
  runDailyObservationAgent,
  runInternalReportAgent,
  runPersistenceAuditAgent,
  runPublicReportAgent,
} from '@/lib/world-vector/agents';

export type RootObservationJob = 'daily' | 'reports' | 'audit' | 'all';

async function persistInstitutionalIndicatorSnapshot() {
  try {
    const [state, worldVector] = await Promise.all([
      buildSfiWorldInterfaceState(),
      buildWorldVectorOperationalState().catch(() => null),
    ]);
    const domainBreakdown = worldVector?.today.observation.domain_values ?? [];
    const persistence = await persistIndicatorSnapshot(state, domainBreakdown);

    return {
      ...persistence,
      captured_at: state.generatedAt,
      domain_count: domainBreakdown.length,
      warnings: state.warnings,
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      captured_at: new Date().toISOString(),
      domain_count: 0,
      warnings: ['indicator_snapshot_generation_failed'],
    };
  }
}

export async function runRootObservationJob(job: RootObservationJob) {
  const gate = await requireGovernedActor('root.operational.observe');
  if (!gate.ok) return { ok: false as const, status: gate.status, body: gate.body };
  if (!gate.ctx.isRoot) {
    return { ok: false as const, status: 403, body: { ok: false, error: 'root_required' } };
  }

  const result: Record<string, unknown> = {
    ok: true,
    actor: gate.ctx.user.id,
    job,
    triggered_at: new Date().toISOString(),
  };

  if (job === 'daily' || job === 'all') {
    result.daily = await runDailyObservationAgent({ persist: true });
    result.indicators = await persistInstitutionalIndicatorSnapshot();
    result.institutional_cycle = await runInstitutionalCycle('root_manual_observation');
  }

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
