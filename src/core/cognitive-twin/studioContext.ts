import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';
import type { CognitiveContextConsumptionTrace } from '@/core/cognitive-spine/contracts/consumptionTrace';
import type { CognitiveSpineSnapshot } from '@/core/cognitive-spine/contracts/snapshot';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { materializeStudioCognitiveSpineContext } from '@/lib/studio/cognitive/studioCognitiveSpineContext';
import { COGNITIVE_TWIN_CONTRACT_VERSION } from './contract';
import { recordCognitiveTwinExperience } from './experience';

const STUDIO_LEARNING_VERSION = 'studio-learning-v1';

type StudioCognitiveSpineRunContext = {
  snapshot: CognitiveSpineSnapshot;
  consumptionTrace: CognitiveContextConsumptionTrace;
};

const studioCognitiveSpineRunContext = new AsyncLocalStorage<StudioCognitiveSpineRunContext>();

function stableStudioLearningKey(value: string) {
  return value.replace(/:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, '');
}

export type StudioTwinContext = {
  contractVersion: string;
  memory: Array<{
    key: string;
    type: string;
    status: string;
    content: unknown;
    evidenceRefs: string[];
    version: string;
  }>;
  decisions: Array<{
    id: string;
    situation: string;
    correctState: string | null;
    generalRule: string;
    requiredEvidence: string[];
    evidenceRefs: string[];
  }>;
  warnings: string[];
  cognitiveSpine?: {
    snapshotId: string;
    snapshotHash: string;
    sourceCutoff: string;
    projectionProfile: string | null;
    profileVersion: string | null;
    consumed: boolean;
  };
};

/**
 * Compatibility read boundary for existing Studio cognitive paths.
 *
 * This function no longer reads live Cognitive Twin memory/decision tables.
 * It materializes one sealed `STUDIO_OBJECT_CONTEXT_V1` Cognitive Spine
 * snapshot and returns only the bounded memory/decision values referenced by
 * that snapshot.
 *
 * The exact sealed artifact and its consumption trace are also stored in a
 * request-local AsyncLocalStorage context. `registerStudioTwinRun()` consumes
 * that same context later in the async execution chain, so persistence records
 * the exact snapshot that was actually used instead of materializing a second
 * "latest" state at write time. Concurrent requests do not share this state.
 */
export async function readStudioTwinContext(): Promise<StudioTwinContext> {
  const now = new Date().toISOString();
  const materialized = await materializeStudioCognitiveSpineContext({
    executionId: `studio-context-${crypto.randomUUID()}`,
    sourceCutoff: now,
    createdAt: now,
  });

  studioCognitiveSpineRunContext.enterWith({
    snapshot: materialized.snapshot,
    consumptionTrace: materialized.trace,
  });

  return {
    ...materialized.twinContext,
    cognitiveSpine: {
      snapshotId: materialized.snapshot.snapshotId,
      snapshotHash: materialized.snapshot.snapshotHash,
      sourceCutoff: materialized.snapshot.semanticPayload.sourceCutoff,
      projectionProfile: materialized.trace.projectionProfile,
      profileVersion: materialized.trace.profileVersion,
      consumed: materialized.trace.ctSnapshotConsumed,
    },
  };
}

export async function registerStudioTwinRun(input: {
  taskId: string;
  role: string;
  objective: string;
  provider: string | null;
  model: string | null;
  status: 'REGISTERED' | 'READY' | 'PLANNING' | 'POLICY_CHECK' | 'EXECUTING' | 'EVIDENCE_PENDING' | 'VERIFYING' | 'APPROVED' | 'RELEASED' | 'BLOCKED' | 'REJECTED' | 'ESCALATED' | 'CLOSED';
  inputSnapshot: Record<string, unknown>;
  outputEnvelope?: Record<string, unknown> | null;
  evidenceRefs: string[];
  limitations?: string[];
  startedAt?: string | null;
  finishedAt?: string | null;
}) {
  const db = createServiceSupabaseClient();
  const sealedSpine = studioCognitiveSpineRunContext.getStore();
  const persistedInputSnapshot = sealedSpine
    ? {
        ...input.inputSnapshot,
        cognitiveSpine: {
          snapshot: sealedSpine.snapshot,
          consumptionTrace: sealedSpine.consumptionTrace,
        },
      }
    : input.inputSnapshot;

  const result = await db.from('sfi_cognitive_twin_runs').insert({
    task_id: input.taskId,
    contract_version: COGNITIVE_TWIN_CONTRACT_VERSION,
    provider: input.provider,
    model: input.model,
    role: input.role,
    status: input.status,
    objective: input.objective,
    input_snapshot: persistedInputSnapshot,
    output_envelope: input.outputEnvelope ?? null,
    evidence_refs: [...new Set(input.evidenceRefs)],
    limitations: [...new Set(input.limitations ?? [])],
    started_at: input.startedAt ?? null,
    finished_at: input.finishedAt ?? null,
  }).select('id').single();

  if (result.error) return { ok: false as const, error: result.error.message, id: null };

  if (input.provider && input.model) {
    const observedAt = new Date().toISOString();
    const existing = await db.from('sfi_cognitive_twin_model_registry')
      .select('id,status')
      .eq('provider', input.provider)
      .eq('model', input.model)
      .maybeSingle();
    if (!existing.error) {
      if (existing.data?.id) {
        await db.from('sfi_cognitive_twin_model_registry')
          .update({ last_observed_at: observedAt })
          .eq('id', existing.data.id);
      } else {
        await db.from('sfi_cognitive_twin_model_registry').insert({
          provider: input.provider,
          model: input.model,
          status: 'UNVERIFIED',
          authorized_roles: [],
          prohibited_roles: [],
          eval_summary: { firstSeenBy: 'studio_cognitive_runtime' },
          evidence_refs: [...new Set(input.evidenceRefs)],
          first_observed_at: observedAt,
          last_observed_at: observedAt,
        });
      }
    }
  }

  return {
    ok: true as const,
    error: null,
    id: String(result.data.id),
    cognitiveSpinePersisted: Boolean(sealedSpine),
    cognitiveSpineSnapshotId: sealedSpine?.snapshot.snapshotId ?? null,
    cognitiveSpineSnapshotHash: sealedSpine?.snapshot.snapshotHash ?? null,
  };
}

export async function persistStudioLearningCandidate(input: {
  memoryKey: string;
  memoryType: 'EVIDENCE' | 'STATE' | 'DECISION' | 'METHOD' | 'ERROR' | 'EXCEPTION';
  content: Record<string, unknown>;
  evidenceRefs: string[];
  sourceRef: string;
  createdBy: string;
}) {
  const memoryKey = stableStudioLearningKey(input.memoryKey);
  const persisted = await recordCognitiveTwinExperience({
    memoryKey,
    memoryType: input.memoryType,
    content: input.content,
    evidenceRefs: input.evidenceRefs,
    sourceKind: 'STUDIO_OBSERVED_RETURN',
    sourceRef: input.sourceRef,
    createdBy: input.createdBy,
    version: STUDIO_LEARNING_VERSION,
  });

  if (!persisted.ok) {
    return { ok: false as const, blocked: persisted.blocked, reason: persisted.reason };
  }
  return {
    ok: true as const,
    blocked: false,
    id: String(persisted.memory?.id ?? persisted.event.id),
    status: 'CANDIDATE' as const,
    version: STUDIO_LEARNING_VERSION,
    memoryKey,
  };
}
