import 'server-only';

import {
  COGNITIVE_SPINE_DECISION_PROVENANCE_VERSION,
  type CognitiveSpineDecisionProvenance,
} from '@/core/cognitive-spine/contracts/decisionProvenance';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { materializeInstitutionalRuntimeCognitiveSpine } from './cognitiveSpineRuntimeMaterializer';

export async function executeInstitutionalRuntimeWithCognitiveSpine(input: {
  context: KernelContext;
  sourceCutoff: string;
  createdAt: string;
  consume?: boolean;
}) {
  const consume = input.consume ?? true;
  const materialized = await materializeInstitutionalRuntimeCognitiveSpine({
    sourceCutoff: input.sourceCutoff,
    executionId: input.context.cycleId,
    createdAt: input.createdAt,
    consume,
  });

  input.context.metadata = {
    ...input.context.metadata,
    cognitiveSpine: materialized.runtimeProjection,
    // Existing LLM augmentation already supports an injected Twin context. By
    // injecting the frozen materialization here, every agent in this run sees
    // the same cut and has no reason to query live Twin state mid-run.
    cognitiveTwinContext: materialized.runtimeProjection.cognitiveTwinContext,
  };

  const runtime = await executeSfiRuntime(input.context);
  const spine = materialized.runtimeProjection;
  const llmRuntime = runtime.context.metadata?.llmRuntime;
  const llm = llmRuntime && typeof llmRuntime === 'object' && !Array.isArray(llmRuntime)
    ? llmRuntime as Record<string, unknown>
    : {};

  const provenanceGaps = [
    'proposal_not_produced_by_institutional_cycle',
    'root_action_not_part_of_institutional_cycle',
    'intervention_not_part_of_institutional_cycle',
    'observed_return_not_part_of_institutional_cycle',
    'next_state_transition_not_materialized_in_same_cycle',
  ];

  const decisionProvenance: CognitiveSpineDecisionProvenance = {
    contractVersion: COGNITIVE_SPINE_DECISION_PROVENANCE_VERSION,
    executionId: input.context.cycleId,
    recordedAt: new Date().toISOString(),
    snapshot: {
      availableId: spine.snapshotId,
      availableHash: spine.snapshotHash,
      consumed: spine.ctSnapshotConsumed,
      consumedId: spine.ctSnapshotConsumed ? spine.snapshotId : null,
      consumedHash: spine.ctSnapshotConsumed ? spine.snapshotHash : null,
      projectionProfile: spine.ctSnapshotConsumed ? spine.projectionProfile : null,
      profileVersion: spine.ctSnapshotConsumed ? spine.profileVersion : null,
      sourceCutoff: spine.sourceCutoff,
    },
    stateRefs: {
      observations: [...spine.eventRefs],
      evidence: [...spine.evidenceRefs],
      memory: [...spine.memoryRefs],
      hypotheses: [...spine.hypothesisRefs],
      constraints: [...spine.decisionRefs, ...spine.freezeRefs],
      contradictions: [...spine.contradictionRefs],
      epistemicState: [...spine.epistemicStateRefs],
    },
    execution: {
      operations: [...runtime.executedAgents],
      alternatives: [],
      rejectedConditions: [],
      model: typeof llm.lastModel === 'string' ? llm.lastModel : null,
      provider: typeof llm.lastProvider === 'string' ? llm.lastProvider : null,
      promptHash: null,
    },
    proposalRef: null,
    rootActionRef: null,
    interventionRef: null,
    returnRef: null,
    transitionRef: null,
    provenanceGaps,
  };

  return {
    runtime,
    cognitiveSpine: {
      ...materialized,
      decisionProvenance,
    },
  };
}
