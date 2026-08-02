import { randomUUID } from 'crypto';

import {
  calculateFS,
  calculatePhiSfi,
  resolveRegime,
} from '@/core/formulas/canonicalFormulas';
import { canonicalAgents } from '@/core/agents';
import { InMemoryEventBus } from '@/core/runtime';
import { emitEpistemicEvent } from '@/core/memory/epistemicEventWriter';
import { processEpistemicEvent } from '@/core/memory/institutionalEventPipeline';

import type {
  AgentResult,
  KernelContext,
  KernelEvidence,
  KernelHypothesis,
  KernelPrediction,
  SfiPermission,
  SfiTraceContext,
} from '@/core/contracts';

type PipelineStatus = 'COMPLETED' | 'FAILED';
type AgentAuditStatus =
  | 'REGISTERED'
  | 'EXECUTABLE'
  | 'PLACEHOLDER'
  | 'OPERATIONAL'
  | 'BLOCKED'
  | 'FAILED';

type PersistedRuntimeEvent = {
  eventName: string;
  agentId: string | null;
  trace: SfiTraceContext;
  confidence: number;
  payload: Record<string, unknown>;
  provenance: Record<string, unknown>;
  authorization: Record<string, unknown>;
};

type PersistedRuntimeEventResult = {
  eventName: string;
  agentId: string | null;
  persisted: boolean;
  epistemicEventId: string | null;
  memoryPromotion: unknown;
  error: string | null;
};

export type PipelinePersistence = {
  persist(event: PersistedRuntimeEvent): Promise<PersistedRuntimeEventResult>;
};

export interface PipelineExecutionResult {
  id: string;
  trace: SfiTraceContext;
  capabilityId: string;
  actor: {
    id: string;
    role: string;
    type: string;
  };
  initialState: {
    evidenceCount: number;
    hypothesisCount: number;
    predictionCount: number;
  };
  regime: string;
  status: PipelineStatus;
  agentResults: Array<AgentResult & {
    auditStatus: AgentAuditStatus;
    durationMs: number;
  }>;
  agentStates: Array<{
    agentId: string;
    name: string;
    status: AgentAuditStatus;
    resultStatus: AgentResult['status'];
    confidence: number;
    durationMs: number;
  }>;
  evidence: KernelEvidence[];
  events: PersistedRuntimeEventResult[];
  memoryWrites: {
    proposed: number;
    accepted: number;
    rejected: number;
    decisions: PersistedRuntimeEventResult[];
  };
  errors: Array<{
    agentId?: string;
    message: string;
  }>;
  durations: {
    totalMs: number;
    byAgent: Record<string, number>;
  };
  coverage: {
    agentsExpected: number;
    agentsExecuted: number;
    operational: number;
    partial: number;
    failed: number;
    evidenceItems: number;
    averageConfidence: number;
  };
  finalState: {
    evidenceCount: number;
    hypothesisCount: number;
    predictionCount: number;
    riskCount: number;
    opportunityCount: number;
    simulationCount: number;
  };
}

export class EpistemicPipelinePersistence implements PipelinePersistence {
  async persist(event: PersistedRuntimeEvent): Promise<PersistedRuntimeEventResult> {
    try {
      const emitted = await emitEpistemicEvent({
        eventName: event.eventName,
        logbookId: event.trace.logbookId,
        epistemicClass: event.agentId ? 'derived' : 'declared',
        schemaVersion: 'sfi-core-runtime-v1',
        sourceId: event.agentId ?? 'CanonicalPipelineRunner',
        sourceType: event.agentId ? 'AGENT' : 'RUNTIME',
        actorId: event.trace.initiatedBy,
        confidence: event.confidence,
        payload: {
          ...event.payload,
          provenance: event.provenance,
          authorization: event.authorization,
        },
        lineage: [event.trace.correlationId],
      });

      if (!emitted.ok) {
        return {
          eventName: event.eventName,
          agentId: event.agentId,
          persisted: false,
          epistemicEventId: null,
          memoryPromotion: null,
          error: emitted.error,
        };
      }

      const memoryPromotion = await processEpistemicEvent(emitted.event);

      return {
        eventName: event.eventName,
        agentId: event.agentId,
        persisted: true,
        epistemicEventId: emitted.event.id,
        memoryPromotion,
        error: null,
      };
    } catch (error) {
      return {
        eventName: event.eventName,
        agentId: event.agentId,
        persisted: false,
        epistemicEventId: null,
        memoryPromotion: null,
        error: error instanceof Error ? error.message : 'pipeline_event_persistence_failed',
      };
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isKernelEvidence(value: unknown): value is KernelEvidence {
  const item = asRecord(value);
  return (
    typeof item.id === 'string' &&
    typeof item.source === 'string' &&
    typeof item.confidence === 'number' &&
    'payload' in item
  );
}

function evidenceFromPayload(payload: unknown): KernelEvidence[] {
  const record = asRecord(payload);
  if (Array.isArray(record.evidence)) {
    return record.evidence.filter(isKernelEvidence);
  }
  if (Object.keys(record).length === 0) return [];
  return [{
    id: `EVIDENCE_${randomUUID()}`,
    source: 'request.payload',
    confidence: 0.5,
    payload,
  }];
}

function hypothesesFromPayload(payload: unknown): KernelHypothesis[] {
  const record = asRecord(payload);
  if (!Array.isArray(record.hypotheses)) return [];
  return record.hypotheses
    .map((item) => asRecord(item))
    .filter((item) => typeof item.statement === 'string')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : `HYPOTHESIS_${randomUUID()}`,
      statement: item.statement as string,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    }));
}

function predictionsFromPayload(payload: unknown): KernelPrediction[] {
  const record = asRecord(payload);
  if (!Array.isArray(record.predictions)) return [];
  return record.predictions
    .map((item) => asRecord(item))
    .filter((item) => typeof item.statement === 'string')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : `PREDICTION_${randomUUID()}`,
      statement: item.statement as string,
      description: typeof item.description === 'string' ? item.description : undefined,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    }));
}

function finalCounts(context: KernelContext) {
  return {
    evidenceCount: context.evidence.length,
    hypothesisCount: context.hypotheses.length,
    predictionCount: context.predictions.length,
    riskCount: context.risks.length,
    opportunityCount: context.opportunities.length,
    simulationCount: context.simulations.length,
  };
}

function auditStatusFor(result: AgentResult): AgentAuditStatus {
  if (result.status === 'FAILED') return 'FAILED';
  if (result.status === 'PARTIAL') return 'BLOCKED';
  if (result.evidence.length > 0 || result.events.length > 0 || result.memoryWrites.length > 0) {
    return 'OPERATIONAL';
  }
  return 'EXECUTABLE';
}

function averageConfidence(results: AgentResult[]) {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, result) => sum + result.confidence, 0);
  return Number((total / results.length).toFixed(4));
}

function promotionAccepted(result: PersistedRuntimeEventResult) {
  const promotion = result.memoryPromotion as { promoted?: unknown } | null;
  return promotion?.promoted === true;
}

function sanitizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'unknown_runtime_error';
}

export class CanonicalPipelineRunner {
  private readonly eventBus = new InMemoryEventBus();
  private readonly persistence: PipelinePersistence;

  constructor(persistence: PipelinePersistence = new EpistemicPipelinePersistence()) {
    this.persistence = persistence;
  }

  private async persistRuntimeEvent(
    events: PersistedRuntimeEventResult[],
    input: PersistedRuntimeEvent
  ) {
    this.eventBus.publish(input.eventName, input);
    const result = await this.persistence.persist(input);
    events.push(result);
    return result;
  }

  async run(input: {
    capabilityId: string;
    actorId: string;
    actorRole?: string;
    actorType?: string;
    permissions?: SfiPermission[];
    payload: unknown;
  }): Promise<PipelineExecutionResult> {
    const executionId = randomUUID();
    const started = Date.now();
    const trace: SfiTraceContext = {
      logbookId: `pipeline-${executionId}`,
      correlationId: randomUUID(),
      initiatedBy: input.actorId,
      createdAt: new Date().toISOString(),
    };

    const phiSfi = calculatePhiSfi(0.62, 0.71, 0.24, 0.05);
    const fS = calculateFS(phiSfi);
    const regime = resolveRegime(phiSfi);
    const initialEvidence = evidenceFromPayload(input.payload);
    const initialHypotheses = hypothesesFromPayload(input.payload);
    const initialPredictions = predictionsFromPayload(input.payload);

    const context: KernelContext = {
      trace,
      capabilityId: input.capabilityId,
      input: input.payload,
      actor: {
        id: input.actorId,
        role: input.actorRole ?? 'SYSTEM',
        type: input.actorType ?? 'SYSTEM',
      },
      permissions: input.permissions ?? ['MODEL_EXECUTE'],
      evidence: initialEvidence,
      hypotheses: initialHypotheses,
      contradictions: [],
      simulations: [],
      risks: [],
      opportunities: [],
      predictions: initialPredictions,
      metadata: {
        pipeline: 'CanonicalPipelineRunner',
        executionId,
        phiSfi,
        fS,
        createdAt: trace.createdAt,
      },
    };

    const initialState = {
      evidenceCount: context.evidence.length,
      hypothesisCount: context.hypotheses.length,
      predictionCount: context.predictions.length,
    };
    const events: PersistedRuntimeEventResult[] = [];
    const errors: PipelineExecutionResult['errors'] = [];
    const agentResults: PipelineExecutionResult['agentResults'] = [];
    const durationsByAgent: Record<string, number> = {};

    await this.persistRuntimeEvent(events, {
      eventName: 'sfi.pipeline.execution.requested',
      agentId: null,
      trace,
      confidence: 1,
      payload: {
        executionId,
        capabilityId: input.capabilityId,
        actor: context.actor,
        initialState,
      },
      provenance: { runtime: 'CanonicalPipelineRunner', phase: 'request' },
      authorization: {
        rule: 'SFI_CORE_MODEL_EXECUTE',
        actorId: input.actorId,
        permissions: context.permissions,
      },
    });

    for (const agent of canonicalAgents) {
      const agentStarted = Date.now();

      try {
        const result = await agent.execute(context);
        const durationMs = Date.now() - agentStarted;
        durationsByAgent[agent.definition.id] = durationMs;

        const auditedResult = {
          ...result,
          auditStatus: auditStatusFor(result),
          durationMs,
        };
        agentResults.push(auditedResult);

        await this.persistRuntimeEvent(events, {
          eventName: 'sfi.pipeline.agent.executed',
          agentId: agent.definition.id,
          trace,
          confidence: result.confidence,
          payload: {
            executionId,
            capabilityId: input.capabilityId,
            agent: agent.definition,
            result,
            durationMs,
          },
          provenance: {
            runtime: 'CanonicalPipelineRunner',
            agentId: agent.definition.id,
            agentName: agent.definition.name,
          },
          authorization: {
            rule: 'SFI_CORE_AGENT_EXECUTION',
            actorId: input.actorId,
            permissions: context.permissions,
          },
        });
      } catch (error) {
        const durationMs = Date.now() - agentStarted;
        durationsByAgent[agent.definition.id] = durationMs;
        const message = sanitizeError(error);
        errors.push({ agentId: agent.definition.id, message });

        const failedResult: AgentResult = {
          trace,
          agentId: agent.definition.id,
          status: 'FAILED',
          output: {
            reason: 'agent_executor_threw',
            error: message,
          },
          observations: [],
          evidence: [],
          events: [],
          memoryWrites: [],
          confidence: 0,
          executionTime: durationMs,
        };

        agentResults.push({
          ...failedResult,
          auditStatus: 'FAILED',
          durationMs,
        });

        await this.persistRuntimeEvent(events, {
          eventName: 'sfi.pipeline.agent.failed',
          agentId: agent.definition.id,
          trace,
          confidence: 0,
          payload: {
            executionId,
            capabilityId: input.capabilityId,
            agent: agent.definition,
            error: message,
            durationMs,
          },
          provenance: {
            runtime: 'CanonicalPipelineRunner',
            agentId: agent.definition.id,
          },
          authorization: {
            rule: 'SFI_CORE_AGENT_EXECUTION',
            actorId: input.actorId,
            permissions: context.permissions,
          },
        });
      }
    }

    const status: PipelineStatus = agentResults.some((result) => result.status === 'FAILED')
      ? 'FAILED'
      : 'COMPLETED';
    const finalState = finalCounts(context);
    const totalMs = Date.now() - started;

    await this.persistRuntimeEvent(events, {
      eventName: status === 'COMPLETED'
        ? 'sfi.pipeline.execution.completed'
        : 'sfi.pipeline.execution.failed',
      agentId: null,
      trace,
      confidence: status === 'COMPLETED' ? averageConfidence(agentResults) : 0,
      payload: {
        executionId,
        capabilityId: input.capabilityId,
        status,
        regime,
        initialState,
        finalState,
        agentResults,
        evidence: context.evidence,
        errors,
        durationMs: totalMs,
      },
      provenance: { runtime: 'CanonicalPipelineRunner', phase: 'final' },
      authorization: {
        rule: 'SFI_CORE_MODEL_EXECUTE',
        actorId: input.actorId,
        permissions: context.permissions,
      },
    });

    const memoryAccepted = events.filter(promotionAccepted).length;
    const memoryRejected = events.filter((event) => event.persisted && !promotionAccepted(event)).length;

    return {
      id: executionId,
      trace,
      capabilityId: input.capabilityId,
      actor: {
        id: input.actorId,
        role: input.actorRole ?? 'SYSTEM',
        type: input.actorType ?? 'SYSTEM',
      },
      initialState,
      regime,
      status,
      agentResults,
      agentStates: agentResults.map((result) => ({
        agentId: result.agentId,
        name: canonicalAgents.find((agent) => agent.definition.id === result.agentId)?.definition.name ?? result.agentId,
        status: result.auditStatus,
        resultStatus: result.status,
        confidence: result.confidence,
        durationMs: result.durationMs,
      })),
      evidence: context.evidence,
      events,
      memoryWrites: {
        proposed: events.length,
        accepted: memoryAccepted,
        rejected: memoryRejected,
        decisions: events,
      },
      errors,
      durations: {
        totalMs,
        byAgent: durationsByAgent,
      },
      coverage: {
        agentsExpected: canonicalAgents.length,
        agentsExecuted: agentResults.length,
        operational: agentResults.filter((result) => result.auditStatus === 'OPERATIONAL').length,
        partial: agentResults.filter((result) => result.status === 'PARTIAL').length,
        failed: agentResults.filter((result) => result.status === 'FAILED').length,
        evidenceItems: context.evidence.length,
        averageConfidence: averageConfidence(agentResults),
      },
      finalState,
    };
  }
}
