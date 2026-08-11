import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown) { return typeof value === 'string' ? value : null; }

export async function readCognitiveTwinExperimentState() {
  const db = createServiceSupabaseClient();
  const result = await db.from('sfi_cognitive_twin_runs')
    .select('*')
    .in('role', ['cognitive_twin_snapshot', 'cognitive_twin_fork'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (result.error) throw new Error(`CT_EXPERIMENT_STATE_READ_FAILED:${result.error.message}`);

  const rows = (result.data ?? []) as Row[];
  const snapshots = rows.filter((row) => row.role === 'cognitive_twin_snapshot').map((row) => {
    const resultRow = record(record(row.output_envelope).result);
    const snapshot = record(resultRow.snapshot);
    return {
      taskId: text(row.task_id),
      status: text(row.status),
      snapshotHash: text(resultRow.snapshotHash),
      headHash: text(snapshot.headHash),
      sealedEpochs: typeof snapshot.sealedEpochs === 'number' ? snapshot.sealedEpochs : null,
      capturedAt: text(snapshot.capturedAt) ?? text(row.created_at),
    };
  });
  const forks = rows.filter((row) => row.role === 'cognitive_twin_fork').map((row) => {
    const resultRow = record(record(row.output_envelope).result);
    const manifest = record(resultRow.forkManifest);
    return {
      taskId: text(row.task_id),
      status: text(row.status),
      forkHash: text(resultRow.forkHash),
      parentSnapshotHash: text(manifest.parentSnapshotHash),
      childSubjectId: text(manifest.childSubjectId),
      childLineageId: text(manifest.childLineageId),
      executionState: text(manifest.status),
      createdAt: text(manifest.createdAt) ?? text(row.created_at),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    snapshots,
    forks,
    boundary: 'Snapshot and fork registration are experimental lineage objects. A REGISTERED_NOT_RUNNING fork is not an executing agent.',
  };
}

export type CognitiveTwinExperimentState = Awaited<ReturnType<typeof readCognitiveTwinExperimentState>>;
