import 'server-only';

import { RUNTIME_GENERAL_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/runtimeGeneral';
import { buildRuntimeCognitiveSpineProjection } from '@/core/cognitive-spine/runtime/kernelProjection';
import { materializeInstitutionalCognitiveSpineProfile } from './cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from './cognitiveSpineTwinContextAdapter';

/**
 * Runtime-specific adapter over the generic institutional Cognitive Spine
 * materializer. The shared materializer owns source reads, temporal cutoff,
 * profile selection, semantic hashing and CT AVAILABLE / CT CONSUMED trace.
 *
 * This adapter only converts the already-sealed Runtime profile into the
 * bounded Twin context consumed by existing Runtime/LLM agents. Memory and
 * decisions remain context; they are not appended to KernelEvidence.
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

  const cognitiveTwinContext = buildBoundedTwinContextFromCognitiveSpine({
    snapshot: materialized.snapshot,
    sourcePlane: materialized.sourcePlane,
  });

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
