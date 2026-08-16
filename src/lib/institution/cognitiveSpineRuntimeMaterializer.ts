import 'server-only';

import { COGNITIVE_TWIN_CONTRACT_VERSION } from '@/core/cognitive-twin/contract';
import type { StudioTwinContext } from '@/core/cognitive-twin/studioContext';
import { RUNTIME_GENERAL_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/runtimeGeneral';
import { buildRuntimeCognitiveSpineProjection } from '@/core/cognitive-spine/runtime/kernelProjection';
import { materializeInstitutionalCognitiveSpineProfile } from './cognitiveSpineProfileMaterializer';

/**
 * Runtime-specific adapter over the generic institutional Cognitive Spine
 * materializer. The shared materializer owns source reads, temporal cutoff,
 * profile selection, semantic hashing and CT AVAILABLE / CT CONSUMED trace.
 *
 * This adapter only converts the already-sealed Runtime profile into the
 * legacy bounded Twin context shape consumed by existing Runtime/LLM agents.
 * Memory and decisions remain context; they are not appended to KernelEvidence.
 */
export async function materializeInstitutionalRuntimeCognitiveSpine(input: {
  sourceCutoff: string;
  executionId: string;
  createdAt: string;
  consume: boolean;
}) {
  const materialized = await materializeInstitutionalCognitiveSpineProfile({
    sourceCutoff: input.sourceCutoff,
    executionId: input.executionId,
    createdAt: input.createdAt,
    profileId: RUNTIME_GENERAL_CONTEXT_PROFILE.profileId,
    consume: input.consume,
    consumptionReason: 'bounded shared institutional runtime context',
  });

  const visibleMemoryRefs = new Set(materialized.snapshot.semanticPayload.memoryRefs);
  const visibleDecisionRefs = new Set(materialized.snapshot.semanticPayload.decisionRefs);

  const cognitiveTwinContext: StudioTwinContext = {
    contractVersion: COGNITIVE_TWIN_CONTRACT_VERSION,
    memory: materialized.sourcePlane.memory
      .filter((item) => visibleMemoryRefs.has(`sfi_amv_memory:${item.id}`))
      .map(({ id: _id, createdAt: _createdAt, ...item }) => item),
    decisions: materialized.sourcePlane.decisions
      .filter((item) => visibleDecisionRefs.has(`sfi_cognitive_twin_decisions:${item.id}`))
      .map(({ approvedAt: _approvedAt, ...item }) => item),
    warnings: materialized.warnings,
  };

  const runtimeProjection = buildRuntimeCognitiveSpineProjection({
    snapshot: materialized.snapshot,
    trace: materialized.trace,
    cognitiveTwinContext,
  });

  return {
    snapshot: materialized.snapshot,
    trace: materialized.trace,
    runtimeProjection,
    cognitiveTwinContext,
    warnings: materialized.warnings,
    sourcePlane: materialized.sourcePlane.summary,
  };
}
