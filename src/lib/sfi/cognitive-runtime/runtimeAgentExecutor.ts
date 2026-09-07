import type { KernelContext } from './kernelContext';
import { executeRegisteredAgent } from './agentExecutionMap';
import { emitGovernedProposalsFromAgentInsight } from './governedProposalEmitter';
import { recordAgentExecutionEvent } from '@/infrastructure/events/cognitiveRuntimeEventRepository';
import { augmentAgentWithLlm } from '@/infrastructure/ai/agentLlmClient';
import { evaluateAgentAiGovernance, SFI_AI_GOVERNANCE_POLICY } from '@/lib/governance/aiGovernancePolicy';
import {
  clearRuntimeModelTelemetryObservation,
  observeRuntimeModelTelemetry,
  reserveRuntimeModelCall,
  runtimeControlSnapshot,
  runtimeExecutionPreflight,
} from './runtimeStopControls';

export interface AgentExecutionResult {
  agentId: string;
  executed: boolean;
  context: KernelContext;
  executedAt: string;
}

export type RuntimeAgentExecutorDependencies = {
  nowMs?: () => number;
  executeAgent?: typeof executeRegisteredAgent;
  augmentAgentWithLlm?: typeof augmentAgentWithLlm;
  emitGovernedProposals?: typeof emitGovernedProposalsFromAgentInsight;
  recordExecutionEvent?: typeof recordAgentExecutionEvent;
};

function llmAugmentationEnabled(agentId: string, context: KernelContext) {
  const governedUniversalAi = context.metadata?.ctSnapshotConsumed === true
    && context.metadata?.aiGovernancePolicyId === 'SFI-AIMS-2026-08';
  if (context.metadata?.llmAugmentation !== true && !governedUniversalAi) return false;
  const allowlist = context.metadata?.llmAugmentationAgents;
  if (!Array.isArray(allowlist)) return true;
  return allowlist.includes(agentId);
}

function compactExecutionMetadata(agentId: string, context: KernelContext) {
  const metadata = context.metadata ?? {};
  const insights = metadata.agentInsights && typeof metadata.agentInsights === 'object'
    ? metadata.agentInsights as Record<string, unknown>
    : {};
  const selectedInsight = insights[agentId] && typeof insights[agentId] === 'object'
    ? insights[agentId]
    : null;
  const keys = [
    'executionId',
    'executionContractVersion',
    'executionRequestSource',
    'capabilityBroker',
    'capabilityGrant',
    'actorId',
    'tenantId',
    'manualRootExecution',
    'objectKey',
    'objectHash',
    'signalType',
    'declaredFunction',
    'objective',
    'question',
    'targets',
    'anchors',
    'executionRequest',
    'contextCoverage',
    'epistemicBoundary',
    'materialEvidenceResolution',
    'governedProposalEmitter',
    'worldSnapshotId',
    'methods',
    'openCycleIds',
    'ctSnapshotId',
    'ctSnapshotHash',
    'ctSnapshotConsumed',
  ];
  const refs: Record<string, unknown> = {};
  for (const key of keys) {
    if (metadata[key] !== undefined) refs[key] = metadata[key];
  }
  return {
    refs,
    aiGovernance: metadata.aiGovernance ?? null,
    llmRuntime: metadata.llmRuntime ?? null,
    runtimeControls: runtimeControlSnapshot(context),
    agentInsight: selectedInsight,
    governedProposalEmitter: metadata.governedProposalEmitter ?? null,
    metadataKeyCount: Object.keys(metadata).length,
    storagePolicy: 'COMPACT_TRACE',
  };
}

export async function runCognitiveAgent(
  agentId: string,
  context: KernelContext,
  dependencies: RuntimeAgentExecutorDependencies = {},
): Promise<AgentExecutionResult> {
  const nowMs = dependencies.nowMs ?? Date.now;
  const executeAgent = dependencies.executeAgent ?? executeRegisteredAgent;
  const augment = dependencies.augmentAgentWithLlm ?? augmentAgentWithLlm;
  const emitProposals = dependencies.emitGovernedProposals ?? emitGovernedProposalsFromAgentInsight;
  const recordExecution = dependencies.recordExecutionEvent ?? recordAgentExecutionEvent;
  const beforeEvidence = context.evidence.length;
  const beforeMetadataKeys = Object.keys(context.metadata ?? {}).length;
  let updatedContext: KernelContext = context;
  let executed = false;
  let deterministicError: string | null = null;
  let llmError: string | null = null;
  let proposalEmitterError: string | null = null;
  const governance = evaluateAgentAiGovernance(agentId, context);
  const runtimePreflight = runtimeExecutionPreflight(context, agentId, nowMs());

  if (!runtimePreflight.allowed) {
    deterministicError = `RUNTIME_EXECUTION_BLOCKED:${runtimePreflight.reason}`;
  } else if (governance.disposition !== 'BLOCK') {
    try {
      updatedContext = executeAgent(agentId, context);
      executed = Boolean(updatedContext);
    } catch (error) {
      deterministicError = error instanceof Error ? error.message : String(error);
      updatedContext = context;
      executed = false;
    }
  } else {
    deterministicError = `AI_GOVERNANCE_BLOCK:${governance.reasons.join(',')}`;
  }

  updatedContext.metadata = {
    ...updatedContext.metadata,
    aiGovernance: {
      policyId: SFI_AI_GOVERNANCE_POLICY.id,
      managementSystem: SFI_AI_GOVERNANCE_POLICY.managementSystem,
      riskGuidance: SFI_AI_GOVERNANCE_POLICY.riskGuidance,
      euTransparencyBaseline: SFI_AI_GOVERNANCE_POLICY.euTransparencyBaseline,
      lastAgentId: agentId,
      disposition: governance.disposition,
      risk: governance.risk,
      reasons: governance.reasons,
      evaluatedAt: new Date().toISOString(),
    },
  };

  const llmRequested = executed && llmAugmentationEnabled(agentId, updatedContext);
  if (llmRequested) {
    const reservation = reserveRuntimeModelCall(updatedContext, agentId, nowMs());
    if (!reservation.allowed) {
      llmError = `RUNTIME_MODEL_CALL_BLOCKED:${reservation.reason}`;
      updatedContext.metadata = {
        ...updatedContext.metadata,
        llmRuntime: {
          ...((updatedContext.metadata?.llmRuntime && typeof updatedContext.metadata.llmRuntime === 'object')
            ? updatedContext.metadata.llmRuntime as Record<string, unknown>
            : {}),
          lastAgentId: agentId,
          lastStatus: 'BLOCKED',
          lastError: llmError,
          updatedAt: new Date().toISOString(),
        },
      };
    } else {
      const preModelAgentInsights = updatedContext.metadata?.agentInsights;
      const preModelLlmRuntime = updatedContext.metadata?.llmRuntime;
      try {
        updatedContext = await augment(agentId, updatedContext);
        const postModelPreflight = runtimeExecutionPreflight(updatedContext, agentId, nowMs());
        if (!postModelPreflight.allowed) {
          llmError = `RUNTIME_MODEL_RESULT_REJECTED:${postModelPreflight.reason}`;
          updatedContext.metadata = {
            ...updatedContext.metadata,
            agentInsights: preModelAgentInsights,
            llmRuntime: preModelLlmRuntime,
          };
          clearRuntimeModelTelemetryObservation(updatedContext);
        } else {
          const observed = observeRuntimeModelTelemetry(updatedContext, agentId);
          if (observed.stopped) llmError = `RUNTIME_MODEL_TELEMETRY_STOP:${observed.reason}`;
        }
      } catch (error) {
        llmError = error instanceof Error ? error.message : String(error);
        const failurePreflight = runtimeExecutionPreflight(updatedContext, agentId, nowMs());
        clearRuntimeModelTelemetryObservation(updatedContext);
        updatedContext.metadata = {
          ...updatedContext.metadata,
          llmRuntime: {
            ...((updatedContext.metadata?.llmRuntime && typeof updatedContext.metadata.llmRuntime === 'object')
              ? updatedContext.metadata.llmRuntime as Record<string, unknown>
              : {}),
            lastAgentId: agentId,
            lastStatus: 'FAILED',
            lastError: llmError,
            updatedAt: new Date().toISOString(),
          },
        };
        if (failurePreflight.allowed) {
          const observed = observeRuntimeModelTelemetry(updatedContext, agentId);
          if (observed.stopped) llmError = `RUNTIME_MODEL_TELEMETRY_STOP:${observed.reason}`;
        }
      }
    }
  }

  if (llmRequested && !llmError) {
    try {
      updatedContext = await emitProposals(agentId, updatedContext);
    } catch (error) {
      proposalEmitterError = error instanceof Error ? error.message : String(error);
      updatedContext.metadata = {
        ...updatedContext.metadata,
        governedProposalEmitter: {
          ...(updatedContext.metadata?.governedProposalEmitter && typeof updatedContext.metadata.governedProposalEmitter === 'object'
            ? updatedContext.metadata.governedProposalEmitter as Record<string, unknown>
            : {}),
          agentId,
          persisted: [],
          skipped: true,
          reason: 'PROPOSAL_EMITTER_FAILED',
          error: proposalEmitterError,
          authorityBoundary: 'AGENT_EXECUTION_REMAINS_VALID; FAILED_PROPOSAL_PERSISTENCE_NEVER_AUTHORIZES_ACTION',
        },
      };
    }
  }

  const afterEvidence = updatedContext.evidence.length;
  const afterMetadataKeys = Object.keys(updatedContext.metadata ?? {}).length;
  const agentInsights = updatedContext.metadata?.agentInsights && typeof updatedContext.metadata.agentInsights === 'object'
    ? updatedContext.metadata.agentInsights as Record<string, unknown>
    : {};
  const insight = agentInsights[agentId] && typeof agentInsights[agentId] === 'object'
    ? agentInsights[agentId] as Record<string, unknown>
    : null;
  const metadata = updatedContext.metadata ?? {};
  const executionRequest = metadata.executionRequest && typeof metadata.executionRequest === 'object'
    ? metadata.executionRequest as Record<string, unknown>
    : null;

  await recordExecution(
    agentId,
    executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED',
    {
      executionId: metadata.executionId ?? null,
      executionContractVersion: metadata.executionContractVersion ?? null,
      requestSource: metadata.executionRequestSource ?? (metadata.manualRootExecution === true ? 'ROOT_MANUAL' : updatedContext.currentEvent),
      requestedBy: metadata.actorId ?? null,
      purpose: executionRequest?.purpose ?? metadata.objective ?? metadata.question ?? null,
      anchors: executionRequest?.anchors ?? metadata.anchors ?? [],
      targets: executionRequest?.targets ?? metadata.targets ?? [],
      requestedOutputs: Array.isArray(executionRequest?.requestedOutputs) ? executionRequest.requestedOutputs : null,
      governanceContext: executionRequest?.governanceContext ?? null,
      epistemicBoundary: metadata.epistemicBoundary ?? null,
      logbookId: updatedContext.logbookId,
      cycleId: updatedContext.cycleId,
      currentEvent: updatedContext.currentEvent,
      evidenceBefore: beforeEvidence,
      evidenceAfter: afterEvidence,
      metadataBefore: beforeMetadataKeys,
      metadataAfter: afterMetadataKeys,
      deterministicError,
      aiGovernance: governance,
      aiGovernancePolicyId: SFI_AI_GOVERNANCE_POLICY.id,
      llmAugmentationRequested: llmRequested,
      llmAugmentationStatus: insight?.status ?? (llmError ? 'FAILED' : llmRequested ? 'NOT_AVAILABLE' : 'NOT_REQUESTED'),
      llmProvider: insight?.provider ?? null,
      llmModel: insight?.model ?? null,
      llmError,
      proposalEmitterError,
      governedProposalEmitter: metadata.governedProposalEmitter ?? null,
      runtimeControls: runtimeControlSnapshot(updatedContext),
      metadata: compactExecutionMetadata(agentId, updatedContext),
    },
  );

  return {
    agentId,
    executed,
    context: updatedContext,
    executedAt: new Date().toISOString(),
  };
}
