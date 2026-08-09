import type { KernelContext } from './kernelContext';
import { executeRegisteredAgent } from './agentExecutionMap';
import { recordAgentExecutionEvent } from './runtimeEventBridge';
import { augmentAgentWithLlm } from './agentLlmBridge';

export interface AgentExecutionResult {
  agentId: string;
  executed: boolean;
  context: KernelContext;
  executedAt: string;
}

export async function runCognitiveAgent(
  agentId: string,
  context: KernelContext,
): Promise<AgentExecutionResult> {
  const beforeEvidence = context.evidence.length;
  const beforeMetadataKeys = Object.keys(context.metadata ?? {}).length;
  let updatedContext: KernelContext = context;
  let executed = false;
  let deterministicError: string | null = null;
  let llmError: string | null = null;

  try {
    updatedContext = executeRegisteredAgent(agentId, context);
    executed = Boolean(updatedContext);
  } catch (error) {
    deterministicError = error instanceof Error ? error.message : String(error);
    updatedContext = context;
    executed = false;
  }

  if (executed && updatedContext.metadata?.llmAugmentation === true) {
    try {
      updatedContext = await augmentAgentWithLlm(agentId, updatedContext);
    } catch (error) {
      llmError = error instanceof Error ? error.message : String(error);
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

  await recordAgentExecutionEvent(
    agentId,
    executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED',
    {
      logbookId: updatedContext.logbookId,
      cycleId: updatedContext.cycleId,
      currentEvent: updatedContext.currentEvent,
      evidenceBefore: beforeEvidence,
      evidenceAfter: afterEvidence,
      metadataBefore: beforeMetadataKeys,
      metadataAfter: afterMetadataKeys,
      deterministicError,
      llmAugmentationRequested: updatedContext.metadata?.llmAugmentation === true,
      llmAugmentationStatus: insight?.status ?? (llmError ? 'FAILED' : 'NOT_REQUESTED_OR_NOT_AVAILABLE'),
      llmProvider: insight?.provider ?? null,
      llmModel: insight?.model ?? null,
      llmError,
      metadata: updatedContext.metadata,
    },
  );

  return {
    agentId,
    executed,
    context: updatedContext,
    executedAt: new Date().toISOString(),
  };
}
