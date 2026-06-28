import { getWorldVectorStatus, getWorldVectorToday } from '../readModel';
import { getWorldVectorPersistenceStatus, persistWorldVectorObservation, persistWorldVectorReport } from '../persistence';
import { buildWorldVectorInternalReport, buildWorldVectorPublicReport } from '../reportBuilder';
import type { WorldVectorAgentResult } from './types';

export async function runPersistenceAuditAgent(): Promise<WorldVectorAgentResult> {
  const [status, today, memory] = await Promise.all([
    getWorldVectorStatus(),
    getWorldVectorToday(),
    getWorldVectorPersistenceStatus(),
  ]);

  const observation = memory.enabled
    ? await persistWorldVectorObservation({ observation: today.observation, cycleRange: today.cycle_range })
    : null;
  const internal = memory.enabled
    ? await persistWorldVectorReport({
      report: buildWorldVectorInternalReport({ observation: today.observation, cycleRange: today.cycle_range }),
      cycleRange: today.cycle_range,
      observation: today.observation,
    })
    : null;
  const publicReport = memory.enabled
    ? await persistWorldVectorReport({
      report: buildWorldVectorPublicReport({ observation: today.observation, cycleRange: today.cycle_range }),
      cycleRange: today.cycle_range,
      observation: today.observation,
    })
    : null;

  const blocked = [
    !status.pulse.latest_snapshot_available ? 'latest_snapshot_missing' : null,
    !memory.enabled ? memory.reason : null,
    observation && !observation.ok ? observation.reason : null,
    internal && !internal.ok ? internal.reason : null,
    publicReport && !publicReport.ok ? publicReport.reason : null,
  ].filter((item): item is string => Boolean(item));

  return {
    ok: true,
    agent: 'persistenceAuditAgent',
    mode: 'persist_if_ready',
    memory,
    data: {
      pulse: status.pulse,
      observation,
      internal_report: internal,
      public_report: publicReport,
    },
    warnings: status.warnings,
    blocked,
  };
}
