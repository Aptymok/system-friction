import { getLatestWorldSpectSnapshot, getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { deriveWorldVectorObservation } from './deriveObservation';
import { getCurrentWorldVectorCycleDay, getWorldVectorCycleRange } from './sectorCycle';
import { getWorldVectorPersistenceStatus } from './persistence';
import type { WorldVectorStatus } from './types';

export async function getWorldVectorToday() {
  const cycleDay = getCurrentWorldVectorCycleDay();
  const cycleRange = getWorldVectorCycleRange();
  const [latest, recent] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    getRecentWorldSpectSnapshots({ days: 90, ingestMode: 'all', limit: 120 }),
  ]);

  return {
    cycle_day: cycleDay,
    cycle_range: cycleRange,
    observation: deriveWorldVectorObservation(latest, cycleDay, {
      recentSampleCount: recent.length,
    }),
    persistence: {
      enabled: false as const,
      reason: 'world_vector_tables_not_installed' as const,
    },
  };
}

export async function getWorldVectorStatus(): Promise<WorldVectorStatus> {
  const currentCycleDay = getCurrentWorldVectorCycleDay();
  const [latest, recent, memory] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    getRecentWorldSpectSnapshots({ days: 90, ingestMode: 'all', limit: 120 }),
    getWorldVectorPersistenceStatus(),
  ]);
  const warnings: string[] = [];

  if (!latest) warnings.push('worldspect_snapshot_missing');
  if (recent.length < 3) warnings.push('world_vector_history_thin');
  if (!memory.enabled) warnings.push(memory.reason);

  return {
    ok: true,
    mode: 'read_only',
    pulse: {
      latest_snapshot_available: Boolean(latest),
      latest_observed_at: latest?.observed_at ?? null,
      sample_count: recent.length,
    },
    memory,
    current_cycle_day: currentCycleDay,
    warnings,
  };
}
