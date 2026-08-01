import { randomUUID } from 'crypto';
import { calculateFS, calculatePhiSfi, resolveRegime } from '@/core/formulas/canonicalFormulas';
import { canonicalAgents } from '@/core/agents';
import { InMemoryEventBus } from '@/core/runtime';
import type { KernelContext, SfiTraceContext } from '@/core/contracts';

export interface PipelineExecutionResult {
  id: string;
  trace: SfiTraceContext;
  regime: string;
  status: 'COMPLETED' | 'FAILED';
  agentResults: Array<{ agentId: string; status: string; confidence: number }>;
  evidence: string[];
}

export class CanonicalPipelineRunner {
  private readonly eventBus = new InMemoryEventBus();

  async run(input: { capabilityId: string; actorId: string; payload: unknown }): Promise<PipelineExecutionResult> {
    const trace: SfiTraceContext = {
      logbookId: `pipeline-${randomUUID()}`,
      correlationId: randomUUID(),
      initiatedBy: input.actorId,
      createdAt: new Date().toISOString(),
    };

    const phiSfi = calculatePhiSfi(0.62, 0.71, 0.24, 0.05);
    const fS = calculateFS(phiSfi);
    const regime = resolveRegime(phiSfi);

    const context: KernelContext = {
      trace,
      capabilityId: input.capabilityId,
      actor: { id: input.actorId, type: 'SYSTEM' },
      stateSnapshot: {
        state: 'ACTIVE',
        generatedAt: new Date().toISOString(),
        sourceMemoryVersion: 1,
        hash: randomUUID(),
      },
      permissions: ['OBSERVATION_READ', 'EVIDENCE_CREATE', 'MEMORY_PROPOSE', 'MODEL_EXECUTE'],
      input: input.payload,
    };

    const agentResults: PipelineExecutionResult['agentResults'] = [];
    const evidence: string[] = [];

    for (const agent of canonicalAgents) {
      const result = await agent.execute(context);
      agentResults.push({ agentId: agent.definition.id, status: result.status, confidence: result.confidence });
      if (result.evidence.length > 0) evidence.push(...result.evidence.map((item) => String(item)));
      this.eventBus.publish('AGENT_EXECUTED', { agentId: agent.definition.id, trace, result });
    }

    return {
      id: randomUUID(),
      trace,
      regime,
      status: 'COMPLETED',
      agentResults,
      evidence,
    };
  }
}
