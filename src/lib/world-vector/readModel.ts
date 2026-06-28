import { getLatestWorldSpectSnapshot, getRecentWorldSpectSnapshots } from '@/lib/worldspect/snapshotStore';
import { deriveWorldVectorObservation } from './deriveObservation';
import { getCurrentWorldVectorCycleDay } from './sectorCycle';
import type { WorldVectorMemoryStatus, WorldVectorStatus } from './types';

const REQUIRED_WORLD_VECTOR_TABLES = [
  'world_vector_cycles',
  'world_vector_observations',
  'world_vector_reports',
];

export function getReadOnlyWorldVectorMemoryStatus(): WorldVectorMemoryStatus {
  return {
    enabled: false,
    reason: 'world_vector_tables_not_installed',
    required_tables: REQUIRED_WORLD_VECTOR_TABLES,
  };
}

export async function getWorldVectorToday() {
  const cycleDay = getCurrentWorldVectorCycleDay();
  const [latest, recent] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    getRecentWorldSpectSnapshots({ days: 90, ingestMode: 'all', limit: 120 }),
  ]);

  return {
    cycle_day: cycleDay,
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
  const [latest, recent] = await Promise.all([
    getLatestWorldSpectSnapshot(),
    getRecentWorldSpectSnapshots({ days: 90, ingestMode: 'all', limit: 120 }),
  ]);
  const warnings: string[] = [];

  if (!latest) warnings.push('worldspect_snapshot_missing');
  if (recent.length < 3) warnings.push('world_vector_history_thin');

  return {
    ok: true,
    mode: 'read_only',
    pulse: {
      latest_snapshot_available: Boolean(latest),
      latest_observed_at: latest?.observed_at ?? null,
      sample_count: recent.length,
    },
    memory: getReadOnlyWorldVectorMemoryStatus(),
    current_cycle_day: currentCycleDay,
    warnings,
  };
}
