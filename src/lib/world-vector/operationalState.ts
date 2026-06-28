import { getWorldVectorStatus, getWorldVectorToday } from './readModel';
import { buildWorldVectorInternalReport, buildWorldVectorPublicReport } from './reportBuilder';
import type { WorldVectorOperationalState } from './types';

export async function buildWorldVectorOperationalState(): Promise<WorldVectorOperationalState> {
  const [status, today] = await Promise.all([
    getWorldVectorStatus(),
    getWorldVectorToday(),
  ]);
  const internal = buildWorldVectorInternalReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const publicReport = buildWorldVectorPublicReport({
    observation: today.observation,
    cycleRange: today.cycle_range,
  });
  const blocked = [
    !status.memory.enabled ? status.memory.reason : null,
    !status.pulse.latest_snapshot_available ? 'latest_snapshot_missing' : null,
    today.observation.status === 'failed' ? 'today_observation_failed' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    status,
    today,
    reports: {
      internal,
      public: publicReport,
    },
    close_cycle: {
      ready: today.cycle_day.isCycleClose && status.memory.enabled && today.observation.status !== 'failed',
      reason: today.cycle_day.isCycleClose
        ? status.memory.enabled ? 'cycle_close_available_for_root' : status.memory.reason
        : 'cycle_close_waiting_for_sunday',
    },
    agent_audit: {
      memory_enabled: status.memory.enabled,
      pulse_available: status.pulse.latest_snapshot_available,
      warnings: [...new Set([...status.warnings, ...today.observation.warnings])],
      blocked,
    },
  };
}
