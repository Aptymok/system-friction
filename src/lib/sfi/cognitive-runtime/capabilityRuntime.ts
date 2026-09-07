import type { SFIEvent } from '../../../../packages/events/src/schema';
import {
  SFI_CAPABILITY_REQUEST_CONTRACT,
  evaluateCapabilityRequest,
  type SfiCapabilityBrokerDecision,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import {
  SFI_CAPABILITY_GRANT_CONTRACT,
  capabilityGrantNonceHash,
  capabilityGrantParentFromContext,
  issueEphemeralCapabilityGrant,
  publicCapabilityGrant,
  validateCapabilityGrantUse,
} from './capabilityGrant';
import type { KernelContext } from './kernelContext';

type RuntimeGrantScope = ReturnType<typeof publicCapabilityGrant>;

export type SfiCapabilityRuntimeResult = {
  request: SfiCapabilityRequest;
  decision: SfiCapabilityBrokerDecision;
  context: KernelContext;
  executed: boolean;
  authorizationAllowed: boolean;
  requestEventId: string | null;
  dispositionEventId: string | null;
  grant: RuntimeGrantScope | null;
  nonceHash: string | null;
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
  now: () => Date;
};

export type SfiCapabilityAdmissionLineage = {
  requestEventId: string;
  dispositionEventId: string;
};

export type SfiCapabilityRuntimeInput = {
  request: SfiCapabilityRequest;
  context: KernelContext;
  depth?: number;
  remainingInvocationBudget?: number;
  alreadySatisfiedCapabilityIds?: string[];
  ancestorCapabilityIds?: string[];
  pendingRequestHashes?: string[];
  pendingCapabilityIds?: string[];
  parentGrant?: RuntimeGrantScope | null;
  onAdmitted?: (
    context: KernelContext,
    decision: SfiCapabilityBrokerDecision,
    lineage: SfiCapabilityAdmissionLineage,
  ) => KernelContext | Promise<KernelContext>;
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
  now: () => new Date(),
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

function inheritedParentGrantForRequest(context: KernelContext, requestedByCapabilityId: string) {
  const inherited = capabilityGrantParentFromContext(context);
  return inherited
    && inherited.principal === requestedByCapabilityId
    && inherited.capabilityId === requestedByCapabilityId
    ? inherited
    : null;
}

function executionContext(
  context: KernelContext,
  request: SfiCapabilityRequest,
  decision: SfiCapabilityBrokerDecision,
  dispositionEventId: string,
  grant: RuntimeGrantScope,
  nonceHash: string,
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
      capabilityGrant: {
        contract: SFI_CAPABILITY_GRANT_CONTRACT,
        ...grant,
        nonceHash,
        dispositionEventId,
        authorizationBoundary: 'EPHEMERAL_GRANT_AUTHORIZES_ONLY_SCOPED_CAPABILITY_INVOCATION',
        secretBoundary: 'RAW_NONCE_AND_CREDENTIALS_NEVER_ENTER_EXECUTION_OR_MODEL_CONTEXT',
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

function emptyRuntimeResult(
  request: SfiCapabilityRequest,
  decision: SfiCapabilityBrokerDecision,
  context: KernelContext,
  requestEventId: string | null,
  dispositionEventId: string | null,
  grant: RuntimeGrantScope | null = null,
  nonceHash: string | null = null,
): SfiCapabilityRuntimeResult {
  return {
    request,
    decision,
    context,
    executed: false,
    authorizationAllowed: false,
    requestEventId,
    dispositionEventId,
    grant,
    nonceHash,
    executionReceipt: null,
  };
}

export async function requestCognitiveCapability(
  input: SfiCapabilityRuntimeInput,
  dependencies: Partial<CapabilityRuntimeDependencies> = {},
): Promise<SfiCapabilityRuntimeResult> {
  const deps: CapabilityRuntimeDependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  const request = input.request;
  const history = await deps.readHistory(input.context);
  const decision = evaluateCapabilityRequest({
    request,
    context: input.context,
    history,
    depth: input.depth,
    remainingInvocationBudget: input.remainingInvocationBudget,
    alreadySatisfiedCapabilityIds: input.alreadySatisfiedCapabilityIds,
    ancestorCapabilityIds: input.ancestorCapabilityIds,
    pendingRequestHashes: input.pendingRequestHashes,
    pendingCapabilityIds: input.pendingCapabilityIds,
  });

  if (decision.deduplicated) {
    return emptyRuntimeResult(request, decision, input.context, null, null);
  }

  const requestEventId = await requireEvent(deps, {
    eventName: 'SFI_CAPABILITY_REQUESTED',
    epistemicClass: CAPABILITY_LINEAGE_EPISTEMIC_CLASS,
    confidence: 1,
    occurredAt: deps.now().toISOString(),
    source: { sourceId: request.requestedByCapabilityId, sourceType: 'cognitive_capability_request' },
    logbookId: input.context.logbookId,
    lineage: [input.context.cycleId, request.parentStepId].filter((value): value is string => Boolean(value)),
    payload: {
      contract: SFI_CAPABILITY_REQUEST_CONTRACT,
      request,
      requestHash: decision.requestHash,
      executionAllowed: false,
      authorizationAllowed: false,
      authorityBoundary: 'CAPABILITY_REQUEST_IS_NOT_AUTHORIZATION',
      epistemicBoundary: 'A capability request is a governed runtime request. It is neither evidence nor observation and carries zero execution authority.',
    },
  });

  const parentGrant = input.parentGrant
    ?? inheritedParentGrantForRequest(input.context, request.requestedByCapabilityId);
  const grantIssue = decision.executionAllowed
    ? issueEphemeralCapabilityGrant({
      request,
      decision,
      context: input.context,
      parentGrant,
      history,
      now: deps.now(),
    })
    : null;
  const grant = grantIssue?.ok ? grantIssue.grant : null;
  const grantProjection = grant ? publicCapabilityGrant(grant) : null;
  const nonceHash = grant ? capabilityGrantNonceHash(grant.nonce) : null;
  const authorizationPrepared = Boolean(grantProjection && nonceHash);

  const dispositionEventId = await requireEvent(deps, {
    eventName: dispositionEventName(decision.disposition),
    epistemicClass: CAPABILITY_LINEAGE_EPISTEMIC_CLASS,
    confidence: 1,
    occurredAt: deps.now().toISOString(),
    source: { sourceId: 'governed_capability_broker', sourceType: 'cognitive_runtime_governance' },
    logbookId: input.context.logbookId,
    lineage: [input.context.cycleId, requestEventId, parentGrant?.grantId, ...decision.lineage]
      .filter((value): value is string => Boolean(value)),
    payload: {
      contract: SFI_CAPABILITY_REQUEST_CONTRACT,
      requestId: request.requestId,
      requestHash: decision.requestHash,
      disposition: decision.disposition,
      reasons: decision.reasons,
      executionAllowed: decision.executionAllowed,
      authorizationAllowedAtIssue: authorizationPrepared,
      authorizationFailureReasons: grantIssue && !grantIssue.ok ? grantIssue.reasons : [],
      requestedByCapabilityId: request.requestedByCapabilityId,
      requestedCapabilityId: request.requestedCapabilityId,
      authorityBoundary: decision.authorityBoundary,
      authorizationBoundary: 'BROKER_ADMISSION_IS_NOT_EXECUTION_AUTHORIZATION; ACTIVE_EPHEMERAL_GRANT_REQUIRED',
      canonicalPromotionAllowed: false,
      ephemeralGrantCreated: authorizationPrepared,
      grantContract: authorizationPrepared ? SFI_CAPABILITY_GRANT_CONTRACT : null,
      grant: grantProjection,
      nonceHash,
      parentGrantId: grantProjection?.parentGrantId ?? null,
      secretBoundary: 'RAW_NONCE_AND_CREDENTIALS_NOT_PERSISTED_OR_EXPOSED_TO_EXECUTION_OR_MODEL_CONTEXT',
    },
  });

  if (!decision.executionAllowed || !grant || !grantProjection || !nonceHash) {
    return emptyRuntimeResult(request, decision, input.context, requestEventId, dispositionEventId, grantProjection, nonceHash);
  }

  const authorizationHistory = await deps.readHistory(input.context);
  const grantUse = validateCapabilityGrantUse({
    grant,
    request,
    parentGrant,
    history: authorizationHistory,
    now: deps.now(),
  });
  if (!grantUse.ok) {
    return emptyRuntimeResult(request, decision, input.context, requestEventId, dispositionEventId, grantProjection, nonceHash);
  }

  let governedContext = executionContext(
    input.context,
    request,
    decision,
    dispositionEventId,
    grantProjection,
    nonceHash,
  );
  if (input.onAdmitted) {
    governedContext = await input.onAdmitted(governedContext, decision, { requestEventId, dispositionEventId });
  }
  const execution = await deps.executeAgent(request.requestedCapabilityId, governedContext);
  return {
    request,
    decision,
    context: execution.context,
    executed: execution.executed,
    authorizationAllowed: true,
    requestEventId,
    dispositionEventId,
    grant: grantProjection,
    nonceHash,
    executionReceipt: {
      eventName: execution.executed ? 'SFI_AGENT_EXECUTED' : 'SFI_AGENT_SKIPPED',
      executionId: request.requestId,
      capabilityId: request.requestedCapabilityId,
    },
  };
}