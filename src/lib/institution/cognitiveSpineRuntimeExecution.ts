import 'server-only';

import {
  COGNITIVE_SPINE_DECISION_PROVENANCE_VERSION,
  type CognitiveSpineDecisionProvenance,
} from '@/core/cognitive-spine/contracts/decisionProvenance';
import type { KernelContext } from '@/lib/sfi/cognitive-runtime/kernelContext';
import { executeSfiRuntime } from '@/lib/sfi/cognitive-runtime/runtime';
import { materializeInstitutionalRuntimeCognitiveSpine } from './cognitiveSpineRuntimeMaterializer';
import { buildTransitionFromPreviousInstitutionalSnapshot } from './cognitiveSpineTransitionStore';

const GOVERNED_LLM_AGENTS = [
  'evidence_hunter',
  'historical_scout',
  'phenotype_resolver',
  'context_builder',
  'trajectory_agent',
  'risk_agent',
  'opportunity_agent',
  'project_execution_manager',
  'reality_calibration',
] as const;

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

  const entryTransitionState = await buildTransitionFromPreviousInstitutionalSnapshot({
    currentSnapshot: materialized.snapshot,
    sourceCutoff: input.sourceCutoff,
    createdAt: input.createdAt,
  });

  input.context.metadata = {
    ...input.context.metadata,
    cognitiveSpine: materialized.runtimeProjection,
    cognitiveTwinContext: materialized.runtimeProjection.cognitiveTwinContext,
    llmAugmentation: true,
    llmAugmentationAgents: [...GOVERNED_LLM_AGENTS],
    autonomousInstitutionalCycle: true,
    externalExecutionRequested: false,
    aiGovernancePolicyId: 'SFI-AIMS-2026-08',
    authorityBoundary: 'SFI may autonomously observe, analyze, simulate, draft, report internally, propose and calibrate. External effects, publication, access grants, spending, canon/formula changes and irreversible actions remain governed.',
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
    entryTransitionRef: entryTransitionState.transition?.transitionId ?? null,
    entryTransitionHash: entryTransitionState.transition?.transitionHash ?? null,
    entryTransition: entryTransitionState.transition ?? null,
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
      warnings: [...new Set([...materialized.warnings, ...entryTransitionState.warnings])],
      entryTransition: entryTransitionState,
      decisionProvenance,
    },
  };
}
