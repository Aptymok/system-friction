import 'server-only';

import {
  getWorldSpectSnapshotAtOrBefore,
  getWorldSpectSnapshotIndexRead,
  type WorldSpectSnapshotIndexRow,
} from '@/lib/worldspect/snapshotStore';
import { deriveWorldVectorObservation } from './deriveObservation';
import { persistWorldVectorObservation } from './persistence';
import { getCurrentWorldVectorCycleDay, getWorldVectorCycleRange } from './sectorCycle';

export const SFI_WORLD_VECTOR_RETROSPECTIVE_CONTRACT = 'SFI-WORLD-VECTOR-RETROSPECTIVE-1.0' as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 90 * DAY_MS;

function validTime(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function utcDay(value: string) {
  const parsed = validTime(value);
  return parsed === null ? null : new Date(parsed).toISOString().slice(0, 10);
}

function recentSampleCount(rows: WorldSpectSnapshotIndexRow[], cutoff: number) {
  const start = cutoff - RECENT_WINDOW_MS;
  return rows.reduce((count, row) => {
    const observed = validTime(row.observed_at);
    return observed !== null && observed >= start && observed <= cutoff ? count + 1 : count;
  }, 0);
}

export async function regenerateWorldVectorRetrospective(input: {
  days?: number;
  maxSnapshots?: number;
  overwrite?: boolean;
} = {}) {
  const days = Number.isFinite(input.days) ? Math.max(1, Math.min(3650, Number(input.days))) : 3650;
  const maxSnapshots = Number.isFinite(input.maxSnapshots) ? Math.max(1, Math.min(5000, Number(input.maxSnapshots))) : 5000;
  const overwrite = input.overwrite !== false;
  const indexRead = await getWorldSpectSnapshotIndexRead({ days, limit: maxSnapshots });
  const ordered = indexRead.data
    .filter((row) => validTime(row.observed_at) !== null)
    .sort((a, b) => Date.parse(a.observed_at) - Date.parse(b.observed_at));

  const latestByDay = new Map<string, WorldSpectSnapshotIndexRow>();
  for (const row of ordered) {
    const day = utcDay(row.observed_at);
    if (day) latestByDay.set(day, row);
  }

  const results: Array<Record<string, unknown>> = [];
  let persisted = 0;
  let regenerated = 0;
  let existing = 0;
  let skipped = 0;
  let failed = 0;

  for (const day of [...latestByDay.keys()].sort((a, b) => a.localeCompare(b))) {
    const cutoff = Date.parse(`${day}T23:59:59.999Z`);
    const snapshot = await getWorldSpectSnapshotAtOrBefore(new Date(cutoff).toISOString());
    if (!snapshot || snapshot.observed_at.slice(0, 10) !== day) {
      skipped += 1;
      results.push({ day, ok: false, skipped: true, reason: 'same_day_worldspect_snapshot_not_available' });
      continue;
    }

    const asOf = new Date(snapshot.observed_at);
    const cycleDay = getCurrentWorldVectorCycleDay(asOf);
    const cycleRange = getWorldVectorCycleRange(asOf);
    const observation = deriveWorldVectorObservation(snapshot, cycleDay, {
      recentSampleCount: recentSampleCount(ordered, Date.parse(snapshot.observed_at)),
    });
    const persistence = await persistWorldVectorObservation({
      observation,
      cycleRange,
      overwrite,
    });

    if (!persistence.ok) {
      failed += 1;
      results.push({
        day,
        ok: false,
        sourceSnapshotId: snapshot.id,
        observedAt: snapshot.observed_at,
        reason: persistence.reason,
        details: persistence.details ?? null,
      });
      continue;
    }

    persisted += 1;
    if (persistence.regenerated) regenerated += 1;
    else if (persistence.existing) existing += 1;
    results.push({
      day,
      ok: true,
      sourceSnapshotId: snapshot.id,
      observedAt: snapshot.observed_at,
      sector: observation.sector,
      status: observation.status,
      confidence: observation.confidence,
      regenerated: persistence.regenerated === true,
      existing: persistence.existing === true,
    });
  }

  const daysProcessed = results.filter((row) => row.ok === true).map((row) => String(row.day));
  return {
    ok: failed === 0,
    contract: SFI_WORLD_VECTOR_RETROSPECTIVE_CONTRACT,
    requested: { days, maxSnapshots, overwrite },
    sourceIndex: {
      rows: ordered.length,
      uniqueDays: latestByDay.size,
      readPlane: indexRead.readPlane,
      primaryDiagnostic: indexRead.primaryDiagnostic,
      truncated: indexRead.truncated,
    },
    range: {
      firstDay: daysProcessed[0] ?? null,
      lastDay: daysProcessed[daysProcessed.length - 1] ?? null,
    },
    counts: { persisted, regenerated, existing, skipped, failed },
    results,
    boundary: 'RETROSPECTIVE RECONSTRUCTION ONLY. Each World Vector day is derived from a WorldSpect snapshot observed on that same UTC day. Future snapshots are never projected backward. Existing T0 WorldSpect records are not rewritten; only the derived World Vector observation is regenerated.',
    egressBoundary: 'Historical discovery reads a lightweight paged WorldSpect timestamp index, then reads at most one full WorldSpect snapshot per reconstructed day.',
  };
}
