import 'server-only';

import { readAdaptiveUniversalLearningContext } from '@/core/cognitive-twin/adaptiveLearningContext';
import { RUNTIME_GENERAL_CONTEXT_PROFILE } from '@/core/cognitive-spine/profiles/runtimeGeneral';
import { buildRuntimeCognitiveSpineProjection } from '@/core/cognitive-spine/runtime/kernelProjection';
import { materializeInstitutionalCognitiveSpineProfile } from './cognitiveSpineProfileMaterializer';
import { buildBoundedTwinContextFromCognitiveSpine } from './cognitiveSpineTwinContextAdapter';

/**
 * Runtime-specific adapter over the generic institutional Cognitive Spine
 * materializer. The shared materializer owns source reads, temporal cutoff,
 * profile selection, semantic hashing and CT AVAILABLE / CT CONSUMED trace.
 *
 * Canonical memory/decisions remain sealed by the Cognitive Spine snapshot.
 * Evidence-complete calibrated learning candidates may be added as a second,
 * explicitly non-canonical adaptive context at the same source cutoff. They
 * never become KernelEvidence and never mutate canon or authority by being
 * consumed here.
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

  const boundedTwin = buildBoundedTwinContextFromCognitiveSpine({
    snapshot: materialized.snapshot,
    sourcePlane: materialized.sourcePlane,
  });
  const adaptiveLearning = input.consume
    ? await readAdaptiveUniversalLearningContext(24, input.sourceCutoff)
    : {
        contract: 'SFI-CT-ADAPTIVE-LEARNING-1.1',
        sourceCutoff: input.sourceCutoff,
        adaptiveCandidates: [],
        promotedCandidateIds: [],
        rejectedCandidateIds: [],
        warning: null,
        boundary: 'CT AVAILABLE but not consumed; adaptive learning is withheld from this execution.',
      };

  const cognitiveTwinContext = {
    ...boundedTwin,
    adaptiveLearning: {
      contract: adaptiveLearning.contract,
      sourceCutoff: adaptiveLearning.sourceCutoff,
      candidates: adaptiveLearning.adaptiveCandidates,
      warning: adaptiveLearning.warning,
      authority: 'ADAPTIVE_NON_CANONICAL',
      boundary: adaptiveLearning.boundary,
    },
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
    warnings: [
      ...materialized.warnings,
      ...(adaptiveLearning.warning ? [`adaptive_learning:${adaptiveLearning.warning}`] : []),
    ],
    sourcePlane: materialized.sourcePlane.summary,
    adaptiveLearning: {
      sourceCutoff: adaptiveLearning.sourceCutoff,
      candidateCount: adaptiveLearning.adaptiveCandidates.length,
      authority: 'ADAPTIVE_NON_CANONICAL',
    },
  };
}
