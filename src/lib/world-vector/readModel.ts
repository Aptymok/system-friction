import { getLatestWorldSpectSnapshotRead, getWorldSpectPublicHistoryRead } from '@/lib/worldspect/snapshotStore';
import { deriveWorldVectorObservation } from './deriveObservation';
import { getCurrentWorldVectorCycleDay, getWorldVectorCycleRange } from './sectorCycle';
import { getWorldVectorPersistenceStatus } from './persistence';
import type { WorldVectorStatus } from './types';

export async function getWorldVectorToday() {
  const cycleDay = getCurrentWorldVectorCycleDay();
  const cycleRange = getWorldVectorCycleRange();
  const [latestRead, recentRead, persistence] = await Promise.all([
    getLatestWorldSpectSnapshotRead(),
    getWorldSpectPublicHistoryRead({ days: 90, ingestMode: 'all', limit: 120 }),
    getWorldVectorPersistenceStatus(),
  ]);
  const latest = latestRead.data;
  const recent = recentRead.data;
  const readProvenance = {
    latest: { plane: latestRead.readPlane, primary_diagnostic: latestRead.primaryDiagnostic },
    history: { plane: recentRead.readPlane, primary_diagnostic: recentRead.primaryDiagnostic },
  };

  return {
    cycle_day: cycleDay,
    cycle_range: cycleRange,
    observation: deriveWorldVectorObservation(latest, cycleDay, {
      recentSampleCount: recent.length,
    }),
    persistence,
    read_provenance: readProvenance,
  };
}

export async function getWorldVectorStatus(): Promise<WorldVectorStatus> {
  const currentCycleDay = getCurrentWorldVectorCycleDay();
  const [latestRead, recentRead, memory] = await Promise.all([
    getLatestWorldSpectSnapshotRead(),
    getWorldSpectPublicHistoryRead({ days: 90, ingestMode: 'all', limit: 120 }),
    getWorldVectorPersistenceStatus(),
  ]);
  const latest = latestRead.data;
  const recent = recentRead.data;
  const warnings: string[] = [];

  if (!latest) warnings.push('worldspect_snapshot_missing');
  if (recent.length < 3) warnings.push('world_vector_history_thin');
  if (!memory.enabled) warnings.push(memory.reason);
  if (latestRead.primaryDiagnostic) warnings.push(`world_vector_latest_primary_degraded:${latestRead.primaryDiagnostic};served=${latestRead.readPlane}`);
  if (recentRead.primaryDiagnostic) warnings.push(`world_vector_history_primary_degraded:${recentRead.primaryDiagnostic};served=${recentRead.readPlane}`);

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
    read_provenance: {
      latest: { plane: latestRead.readPlane, primary_diagnostic: latestRead.primaryDiagnostic },
      history: { plane: recentRead.readPlane, primary_diagnostic: recentRead.primaryDiagnostic },
    },
    warnings,
  };
}
