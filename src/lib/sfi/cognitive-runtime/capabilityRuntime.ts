import type { SFIEvent } from '../../../../packages/events/src/schema';
import {
  SFI_CAPABILITY_REQUEST_CONTRACT,
  evaluateCapabilityRequest,
  type SfiCapabilityBrokerDecision,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import type { KernelContext } from './kernelContext';

export type SfiCapabilityRuntimeResult = {
  request: SfiCapabilityRequest;
  decision: SfiCapabilityBrokerDecision;
  context: KernelContext;
  executed: boolean;
  requestEventId: string | null;
  dispositionEventId: string | null;
  executionReceipt: {
    eventName: 'SFI_AGENT_EXECUTED' | 'SFI_AGENT_SKIPPED';
    executionId: string;
    capabilityId: string;
  } | null;
};

export type CapabilityEventInput = Required<
  Pick<SFIEvent, 'eventName' | 'epistemicClass' | 'confidence' | 'source'>
> & Partial<Pick<SFIEvent, 'occurredAt' | 'lineage' | 'payload'>> & {
  logbookId?: string;
  schemaVersion?: string;
};

const CAPABILITY_LINEAGE_EPISTEMIC_CLASS = 'derived' satisfies SFIEvent['epistemicClass'];

type AgentExecutionResult = {
  agentId: string;
  executed: boolean;
  context: KernelContext;
  executedAt: string;
};

type CapabilityRuntimeDependencies = {
  readHistory: (context: KernelContext) => Promise<SfiCapabilityHistoryEntry[]>;
  appendEvent: (input: CapabilityEventInput) => Promise<{ ok: true; eventId: string } | { ok: false; error: string }>;
  executeAgent: (agentId: string, context: KernelContext) => Promise<AgentExecutionResult>;
};

type CapabilityRuntimeInput = {
  request: SfiCapabilityRequest;
  context: KernelContext;
  depth?: number;
  remainingInvocationBudget?: number;
  alreadySatisfiedCapabilityIds?: string[];
};

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

async function readHistory(context: KernelContext): Promise<SfiCapabilityHistoryEntry[]> {
  const { streamEpistemicEvents } = await import('@/lib/events/eventStore');
  const result = await streamEpistemicEvents(context.logbookId, 500);
  return (result.data ?? []).map((item) => ({
    eventId: typeof item.event_id === 'string' ? item.event_id : null,
    eventName: typeof item.event_name === 'string' ? item.event_name : '',
    payload: item.payload,
  }));
}

async function appendEvent(input: CapabilityEventInput) {
  const { appendEpistemicEvent } = await import('@/lib/events/eventStore');
  const result = await appendEpistemicEvent(input);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, eventId: String(result.data.event_id) };
}

async function executeAgent(agentId: string, context: KernelContext) {
  const { runCognitiveAgent } = await import('./runtimeAgentExecutor');
  return runCognitiveAgent(agentId, context);
}

const DEFAULT_DEPENDENCIES: CapabilityRuntimeDependencies = {
  readHistory,
  appendEvent,
  executeAgent,
};

function dispositionEventName(disposition: SfiCapabilityBrokerDecision['disposition']) {
  if (disposition === 'ADMIT') return 'SFI_CAPABILITY_ADMITTED';
  if (disposition === 'DENY') return 'SFI_CAPABILITY_DENIED';
  return 'SFI_CAPABILITY_DEFERRED';
}

async function requireEvent(
  deps: CapabilityRuntimeDependencies,
  input: CapabilityEventInput,
) {
  const result = await deps.appendEvent(input);
  if (!result.ok) throw new Error(`CAPABILITY_LINEAGE_PERSISTENCE_FAILED:${result.error}`);
  return result.eventId;
}

function executionContext(
  context: KernelContext,
  request: SfiCapabilityRequest,
  decision: SfiCapabilityBrokerDecision,
  dispositionEventId: string,
): KernelContext {
  return {
    ...context,
    metadata: {
      ...context.metadata,
      executionId: request.requestId,
      executionContractVersion: SFI_CAPABILITY_REQUEST_CONTRACT,
      executionRequestSource: 'CAPABILITY_BROKER',
      capabilityBroker: {
        requestId: request.requestId,
        requestHash: decision.requestHash,
        disposition: decision.disposition,
        dispositionEventId,
        requestedByCapabilityId: request.requestedByCapabilityId,
        requestedCapabilityId: request.requestedCapabilityId,
        trajectoryId: request.trajectoryId,
        authorityBoundary: decision.authorityBoundary,
      },
    },
  };
}

export function capabilityRequestsFromContext(
  context: KernelContext,
  requestedByCapabilityId: string,
): SfiCapabilityRequest[] {
  const metadata = row(context.metadata);
  const raw = Array.isArray(metadata.capabilityRequests) ? metadata.capabilityRequests : [];
  const requests: SfiCapabilityRequest[] = [];
  for (const candidate of raw) {
    const value = row(candidate);
    if (value.requestedByCapabilityId !== requestedByCapabilityId) continue;
    if (typeof value.requestId !== 'string' || typeof value.trajectoryId !== 'string') continue;
    if (typeof value.requestedCapabilityId !== 'string' || typeof value.reason !== 'string') continue;
    if (!['LOW', 'NORMAL', 'HIGH', 'BLOCKING'].includes(String(value.urgency))) continue;
    if (typeof value.requestedAt !== 'string') continue;
    requests.push({
      requestId: value.requestId,
      trajectoryId: value.trajectoryId,
      parentStepId: typeof value.parentStepId === 'string' ? value.parentStepId : null,
      requestedByCapabilityId,
      requestedCapabilityId: value.requestedCapabilityId,
      reason: value.reason,
      requiredInputs: Array.isArray(value.requiredInputs) ? value.requiredInputs.filter((item): item is string => typeof item === 'string') : [],
      availableEvidenceRefs: Array.isArray(value.availableEvidenceRefs) ? value.availableEvidenceRefs.filter((item): item is string => typeof item === 'string') : [],
      requestedOutputs: Array.isArray(value.requestedOutputs) ? value.requestedOutputs.filter((item): item is string => typeof item === 'string') : [],
      urgency: value.urgency as SfiCapabilityRequest['urgency'],
      requestedAt: value.requestedAt,
    });
  }
  return requests;
}

export async function requestCognitiveCapability(
  input: CapabilityRuntimeInput,
  dependencies: Partial<CapabilityRuntimeDependencies> = {},
): Promise<SfiCapabilityRuntimeResult> {
  const deps: CapabilityRuntimeDependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const history = await deps.readHistory(input.context);
  const decision = evaluateCapabilityRequest({
    request: input.request,
    context: input.context,
    history,
    depth: input.depth,
    remainingInvocationBudget: input.remainingInvocationBudget,
    alreadySatisfiedCapabilityIds: input.alreadySatisfiedCapabilityIds,
  });

  // Equivalent requests terminate against prior lineage. Do not append another
  // request/disposition pair, which would turn deduplication into event amplification.
  if (decision.deduplicated) {
    return {
      request: input.request,
      decision,
      context: input.context,
      executed: false,
      requestEventId: null,
      dispositionEventId: null,
      executionReceipt: null,
    };
  }

  const occurredAt = new Date().toISOString();
  const requestEventId = await requireEvent(deps, {
    eventName: 'SFI_CAPABILITY_REQUESTED',
    epistemicClass: CAPABILITY_LINEAGE_EPISTEMIC_CLASS,
    confidence: 1,
    occurredAt,
    source: { sourceId: input.request.requestedByCapabilityId, sourceType: 'cognitive_capability_request' },
    logbookId: input.context.logbookId,
    lineage: [input.context.cycleId, input.request.parentStepId].filter((value): value is string => Boolean(value)),
    payload: {
      contract: SFI_CAPABILITY_REQUEST_CONTRACT,
      request: input.request,
      requestHash: decision.requestHash,
      executionAllowed: false,
      authorityBoundary: 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION',
      epistemicBoundary: 'A capability request is a governed runtime request. It is neither evidence nor observation and carries zero execution authority.',
    },
  });

  const dispositionEventId = await requireEvent(deps, {
    eventName: dispositionEventName(decision.disposition),
    epistemicClass: CAPABILITY_LINEAGE_EPISTEMIC_CLASS,
    confidence: 1,
    occurredAt: new Date().toISOString(),
    source: { sourceId: 'governed_capability_broker', sourceType: 'cognitive_runtime_governance' },
    logbookId: input.context.logbookId,
    lineage: [input.context.cycleId, requestEventId, ...decision.lineage],
    payload: {
      contract: SFI_CAPABILITY_REQUEST_CONTRACT,
      requestId: input.request.requestId,
      requestHash: decision.requestHash,
      disposition: decision.disposition,
      reasons: decision.reasons,
      executionAllowed: decision.executionAllowed,
      requestedByCapabilityId: input.request.requestedByCapabilityId,
      requestedCapabilityId: input.request.requestedCapabilityId,
      authorityBoundary: decision.authorityBoundary,
      canonicalPromotionAllowed: false,
      ephemeralGrantCreated: false,
    },
  });

  if (!decision.executionAllowed) {
    return {
      request: input.request,
      decision,
      context: input.context,
      executed: false,
      requestEventId,
      dispositionEventId,
      executionReceipt: null,
    };
  }

  const governedContext = executionContext(input.context, input.request, decision, dispositionEventId);
  const execution = await deps.executeAgent(input.request.requestedCapabilityId, governedContext);
  return {
    request: input.request,
    decision,
    context: execution.context,
    executed: execution.executed,
    requestEventId,
    dispositionEventId,
    executionReceipt: {
      eventName: execution.executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED',
      executionId: input.request.requestId,
      capabilityId: input.request.requestedCapabilityId,
    },
  };
}
