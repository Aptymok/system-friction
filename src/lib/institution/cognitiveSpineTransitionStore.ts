import 'server-only';

import type { CognitiveSpineSnapshot } from '@/core/cognitive-spine/contracts/snapshot';
import { semanticSnapshotHash } from '@/core/cognitive-spine/projector/cognitiveStateProjector';
import { buildCognitiveSpineTransition } from '@/core/cognitive-spine/transitions/buildTransition';
import { sortedUnique } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function snapshotFromRun(row: Row): CognitiveSpineSnapshot | null {
  const inputSnapshot = record(row.input_snapshot);
  const spine = record(inputSnapshot.cognitiveSpine);
  const candidate = record(spine.snapshot) as unknown as CognitiveSpineSnapshot;
  if (!candidate.snapshotId || !candidate.snapshotHash || !candidate.semanticPayload) return null;
  try {
    return semanticSnapshotHash(candidate.semanticPayload) === candidate.snapshotHash ? candidate : null;
  } catch {
    return null;
  }
}

function difference(current: string[], previous: string[]) {
  const previousSet = new Set(previous);
  return sortedUnique(current.filter((value) => !previousSet.has(value)));
}

/**
 * Builds the explicit Δ record from the immediately preceding persisted
 * institutional snapshot to the current one. The transition is later stored
 * inside the current run input_snapshot; no new table is required.
 */
export async function buildTransitionFromPreviousInstitutionalSnapshot(input: {
  currentSnapshot: CognitiveSpineSnapshot;
  sourceCutoff: string;
  createdAt: string;
}) {
  const db = createServiceSupabaseClient();
  const previousResult = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,input_snapshot,started_at')
    .eq('role', 'institutional_cycle')
    .lt('started_at', input.sourceCutoff)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousResult.error) {
    return {
      transition: null,
      previousRunId: null,
      warnings: [`cognitive_spine_previous_snapshot_lookup_failed:${previousResult.error.message}`],
    };
  }
  if (!previousResult.data) {
    return {
      transition: null,
      previousRunId: null,
      warnings: ['cognitive_spine_genesis_no_previous_snapshot'],
    };
  }

  const previousRow = record(previousResult.data);
  const previousSnapshot = snapshotFromRun(previousRow);
  if (!previousSnapshot) {
    return {
      transition: null,
      previousRunId: text(previousRow.id),
      warnings: ['cognitive_spine_previous_snapshot_invalid_or_legacy'],
    };
  }

  const currentManifestRefs = input.currentSnapshot.semanticPayload.sourceManifest.map((item) => item.ref);
  const previousManifestRefs = previousSnapshot.semanticPayload.sourceManifest.map((item) => item.ref);
  const transitionInputs = difference(currentManifestRefs, previousManifestRefs);
  const admittedEpistemicRefs = difference(
    input.currentSnapshot.semanticPayload.epistemicStateRefs,
    previousSnapshot.semanticPayload.epistemicStateRefs,
  );
  const currentCritical = new Set([
    ...input.currentSnapshot.semanticPayload.decisionRefs,
    ...input.currentSnapshot.semanticPayload.freezeRefs,
  ]);
  const unchangedCriticalRefs = sortedUnique([
    ...previousSnapshot.semanticPayload.decisionRefs,
    ...previousSnapshot.semanticPayload.freezeRefs,
  ].filter((ref) => currentCritical.has(ref)));

  const transition = buildCognitiveSpineTransition(previousSnapshot, input.currentSnapshot, {
    transitionId: `CT-TR-${previousSnapshot.snapshotHash.slice(0, 12)}-${input.currentSnapshot.snapshotHash.slice(0, 12)}`,
    createdAt: input.createdAt,
    transitionInputs,
    admittedEpistemicRefs,
    unchangedCriticalRefs,
    runtimeMetadata: {
      previousRunId: text(previousRow.id),
      previousTaskId: text(previousRow.task_id),
      materializedBy: 'institutional_cycle',
    },
  });

  return {
    transition,
    previousRunId: text(previousRow.id),
    previousSnapshotId: previousSnapshot.snapshotId,
    previousSnapshotHash: previousSnapshot.snapshotHash,
    warnings: [] as string[],
  };
}
