import 'server-only';

import type { CognitiveSpineSnapshot } from '@/core/cognitive-spine/contracts/snapshot';
import { semanticSnapshotHash } from '@/core/cognitive-spine/projector/cognitiveStateProjector';
import { canonicalSha256 } from '@/core/cognitive-spine/serialization/canonicalSerialize';
import { appendOperationalEvent, createActionProposal, recordValue, stringValue } from '@/lib/operational/common';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function extractSnapshot(run: Row): CognitiveSpineSnapshot {
  const inputSnapshot = record(run.input_snapshot);
  const cognitiveSpine = record(inputSnapshot.cognitiveSpine);
  const snapshot = record(cognitiveSpine.snapshot) as unknown as CognitiveSpineSnapshot;
  if (!snapshot.snapshotId || !snapshot.snapshotHash || !snapshot.semanticPayload) {
    throw new Error('COGNITIVE_SPINE_RUN_SNAPSHOT_MISSING');
  }
  const calculated = semanticSnapshotHash(snapshot.semanticPayload);
  if (calculated !== snapshot.snapshotHash) {
    throw new Error('COGNITIVE_SPINE_RUN_SNAPSHOT_HASH_MISMATCH');
  }
  return snapshot;
}

async function existingProposalForRun(runId: string) {
  const db = createServiceSupabaseClient();
  const result = await db.from('action_proposals')
    .select('*')
    .eq('expected_field_delta->payload->cognitiveSpine->>sourceRunId', runId)
    .limit(1)
    .maybeSingle();
  if (result.error) throw new Error(`COGNITIVE_SPINE_PROPOSAL_LOOKUP_FAILED:${result.error.message}`);
  return result.data ?? null;
}

/**
 * Explicitly promotes one completed institutional Runtime run into the existing
 * governed action-proposal lifecycle. Scheduled cycles do not auto-propose.
 *
 * The historical run is never rewritten. The new proposal points back to the
 * run and sealed snapshot, preserving the temporal transition as a new node.
 */
export async function proposeFromCognitiveSpineRun(input: {
  runId: string;
  actorId: string;
  title?: string | null;
  objective?: string | null;
  note?: string | null;
}) {
  const db = createServiceSupabaseClient();
  const runResult = await db.from('sfi_cognitive_twin_runs')
    .select('id,task_id,role,status,input_snapshot,output_envelope,evidence_refs,started_at,finished_at')
    .eq('id', input.runId)
    .maybeSingle();

  if (runResult.error) throw new Error(`COGNITIVE_SPINE_RUN_LOOKUP_FAILED:${runResult.error.message}`);
  if (!runResult.data) throw new Error('COGNITIVE_SPINE_RUN_NOT_FOUND');
  const run = record(runResult.data);
  if (text(run.role) !== 'institutional_cycle') throw new Error('COGNITIVE_SPINE_RUN_ROLE_NOT_PROMOTABLE');

  const existing = await existingProposalForRun(input.runId);
  if (existing) {
    return { ok: true as const, created: false as const, proposal: existing, sourceRunId: input.runId };
  }

  const snapshot = extractSnapshot(run);
  const inputSnapshot = record(run.input_snapshot);
  const spine = record(inputSnapshot.cognitiveSpine);
  const consumptionTrace = record(spine.consumptionTrace);
  if (consumptionTrace.ctSnapshotConsumed !== true) {
    throw new Error('COGNITIVE_SPINE_RUN_WAS_NOT_CONSUMED');
  }

  const objective = input.objective?.trim()
    || 'Submit a selected Cognitive Spine Runtime result to ROOT/ACP governance without authorizing execution.';
  const provenance = {
    sourceRunId: String(run.id),
    sourceTaskId: text(run.task_id),
    runStatus: text(run.status),
    runStartedAt: text(run.started_at),
    runFinishedAt: text(run.finished_at),
    snapshotId: snapshot.snapshotId,
    snapshotHash: snapshot.snapshotHash,
    sourceCutoff: snapshot.semanticPayload.sourceCutoff,
    projectorVersion: snapshot.semanticPayload.projectorVersion,
    policyVersion: snapshot.semanticPayload.policyVersion,
    projectionProfile: snapshot.semanticPayload.projectionProfile,
    evidenceRefs: Array.isArray(run.evidence_refs) ? run.evidence_refs : [],
    note: input.note?.trim() || null,
    executionAllowed: false,
  };
  const provenanceHash = canonicalSha256(provenance);

  const event = await appendOperationalEvent({
    eventName: 'cognitive_spine.runtime.proposal_created',
    actorId: input.actorId,
    confidence: 1,
    payload: {
      source_run_id: String(run.id),
      snapshot_id: snapshot.snapshotId,
      snapshot_hash: snapshot.snapshotHash,
      provenance_hash: provenanceHash,
      execution_allowed: false,
      governance_required: true,
      note: provenance.note,
    },
    lineage: [String(run.id), snapshot.snapshotId, snapshot.snapshotHash],
  });
  if (!event.ok) throw new Error(`COGNITIVE_SPINE_PROPOSAL_EVENT_FAILED:${'error' in event ? event.error : 'unknown'}`);

  const proposal = await createActionProposal({
    proposalType: 'cognitive_spine_runtime_proposal',
    actorId: input.actorId,
    title: input.title?.trim() || `Cognitive Spine proposal · ${snapshot.snapshotId}`,
    objective,
    inputVectorHash: snapshot.snapshotHash,
    contentHash: provenanceHash,
    status: 'proposed',
    eventId: event.data.id,
    payload: {
      cognitiveSpine: provenance,
      governanceBoundary: {
        rootDecisionRequired: true,
        executionAllowed: false,
        epistemicUpgradeAllowed: false,
      },
      sourceRunOutputHash: canonicalSha256(recordValue(run.output_envelope)),
    },
  });
  if (!proposal.ok) throw new Error(`COGNITIVE_SPINE_ACTION_PROPOSAL_FAILED:${proposal.error}:${stringValue(proposal.details) ?? 'unknown'}`);

  return {
    ok: true as const,
    created: true as const,
    proposal: proposal.data,
    sourceRunId: String(run.id),
    sourceSnapshotId: snapshot.snapshotId,
    sourceSnapshotHash: snapshot.snapshotHash,
    proposalEventId: event.data.id,
    provenanceHash,
  };
}
