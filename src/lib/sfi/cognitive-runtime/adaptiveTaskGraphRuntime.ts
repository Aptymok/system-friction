import {
  capabilityRequestHash,
  type SfiCapabilityBrokerDecision,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import {
  capabilityRequestsFromContext,
  requestCognitiveCapability,
  type SfiCapabilityRuntimeInput,
  type SfiCapabilityRuntimeResult,
} from './capabilityRuntime';
import { SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY } from './convergedRegistry';
import type { KernelContext } from './kernelContext';
import {
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  type SfiTaskGraph,
  type SfiTaskGraphEdge,
  type SfiTaskGraphMutationKind,
  type SfiTaskGraphNode,
  type SfiTaskGraphNodeState,
} from './types';

export { SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS };

const PENDING_STATES = new Set<SfiTaskGraphNodeState>([
  'PLANNED',
  'ADMITTED',
  'RUNNING',
  'WAITING_EVIDENCE',
  'WAITING_AUTHORITY',
]);

const TRANSITIONS: Record<SfiTaskGraphNodeState, ReadonlySet<SfiTaskGraphNodeState>> = {
  PLANNED: new Set(['ADMITTED', 'WAITING_EVIDENCE', 'WAITING_AUTHORITY', 'SKIPPED', 'FAILED', 'SUPERSEDED']),
  ADMITTED: new Set(['RUNNING', 'SKIPPED', 'FAILED', 'SUPERSEDED']),
  RUNNING: new Set(['COMPLETED', 'WAITING_EVIDENCE', 'WAITING_AUTHORITY', 'SKIPPED', 'FAILED', 'SUPERSEDED']),
  WAITING_EVIDENCE: new Set(['SUPERSEDED', 'FAILED', 'SKIPPED']),
  WAITING_AUTHORITY: new Set(['SUPERSEDED', 'FAILED', 'SKIPPED']),
  COMPLETED: new Set(),
  SKIPPED: new Set(),
  FAILED: new Set(),
  SUPERSEDED: new Set(),
};

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function unique(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function mutation(
  graph: SfiTaskGraph,
  kind: SfiTaskGraphMutationKind,
  nodeId: string | null,
  requestId: string | null,
  detail: Record<string, unknown>,
) {
  graph.mutations.push({
    mutationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    kind,
    nodeId,
    requestId,
    detail,
  });
}

export function validateTaskGraphInvocationBudget(graph: SfiTaskGraph): string[] {
  const budget = graph.invocationBudget as SfiTaskGraph['invocationBudget'] | undefined;
  if (!budget || typeof budget !== 'object') return ['INVOCATION_BUDGET_REQUIRED'];

  const errors: string[] = [];
  const max = budget.max;
  const used = budget.used;
  const remaining = budget.remaining;
  if (!Number.isSafeInteger(max)) errors.push('MAX_MUST_BE_SAFE_INTEGER');
  else {
    if (max <= 0) errors.push('MAX_MUST_BE_POSITIVE');
    if (max > SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS) {
      errors.push(`MAX_EXCEEDS_ABSOLUTE_TRAJECTORY_LIMIT:${max}:${SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS}`);
    }
  }
  if (!Number.isSafeInteger(used)) errors.push('USED_MUST_BE_SAFE_INTEGER');
  else if (used < 0) errors.push('USED_MUST_NOT_BE_NEGATIVE');
  if (!Number.isSafeInteger(remaining)) errors.push('REMAINING_MUST_BE_SAFE_INTEGER');
  else if (remaining < 0) errors.push('REMAINING_MUST_NOT_BE_NEGATIVE');

  if (Number.isSafeInteger(max) && Number.isSafeInteger(used)) {
    if (used > max) errors.push(`USED_EXCEEDS_MAX:${used}:${max}`);
    if (Number.isSafeInteger(remaining) && remaining !== max - used) {
      errors.push(`REMAINING_MISMATCH:${remaining}:${max - used}`);
    }
  }
  return errors;
}

function assertValidTaskGraphInvocationBudget(graph: SfiTaskGraph) {
  const errors = validateTaskGraphInvocationBudget(graph);
  if (errors.length > 0) {
    throw new Error(`TASK_GRAPH_INVOCATION_BUDGET_INVALID:${errors.join('|')}`);
  }
}

export function taskGraphFromContext(context: KernelContext): SfiTaskGraph | null {
  const value = context.metadata?.taskGraph;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const graph = value as SfiTaskGraph;
  if (graph.mode !== 'ADAPTIVE') return null;
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(graph.mutations)) {
    throw new Error('ADAPTIVE_TASK_GRAPH_INVALID_SHAPE');
  }
  assertValidTaskGraphInvocationBudget(graph);
  return graph;
}

export function contextWithTaskGraph(context: KernelContext, graph: SfiTaskGraph): KernelContext {
  assertValidTaskGraphInvocationBudget(graph);
  return { ...context, metadata: { ...context.metadata, taskGraph: graph } };
}

export function validateTaskGraphTransition(from: SfiTaskGraphNodeState, to: SfiTaskGraphNodeState) {
  return TRANSITIONS[from].has(to);
}

export function transitionTaskGraphNode(
  graph: SfiTaskGraph,
  nodeId: string,
  next: SfiTaskGraphNodeState,
  patch: Partial<SfiTaskGraphNode> = {},
) {
  const node = graph.nodes.find((candidate) => candidate.nodeId === nodeId);
  if (!node) throw new Error(`TASK_GRAPH_NODE_NOT_FOUND:${nodeId}`);
  if (node.state === next) return node;
  if (!validateTaskGraphTransition(node.state, next)) {
    throw new Error(`TASK_GRAPH_STATE_TRANSITION_FORBIDDEN:${node.state}:${next}:${nodeId}`);
  }
  const previous = node.state;
  Object.assign(node, patch, { state: next });
  mutation(graph, 'NODE_STATE_CHANGED', nodeId, node.requestId, { from: previous, to: next });
  return node;
}

export function reserveTaskGraphInvocation(graph: SfiTaskGraph, nodeId: string) {
  assertValidTaskGraphInvocationBudget(graph);
  if (graph.invocationBudget.remaining <= 0 || graph.invocationBudget.used >= graph.invocationBudget.max) {
    mutation(graph, 'LIMIT_BLOCKED', nodeId, null, {
      limit: 'MAX_CAPABILITY_INVOCATIONS',
      max: graph.invocationBudget.max,
      used: graph.invocationBudget.used,
    });
    graph.status = 'stopped';
    graph.stop = {
      stopped: true,
      reason: 'MAX_CAPABILITY_INVOCATIONS_REACHED',
      evaluatedAt: new Date().toISOString(),
    };
    return false;
  }
  graph.invocationBudget.used += 1;
  graph.invocationBudget.remaining = Math.max(0, graph.invocationBudget.max - graph.invocationBudget.used);
  return true;
}

function pathExists(graph: SfiTaskGraph, from: string, target: string) {
  const queue = [from];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const edge of graph.edges) {
      if (edge.from === current && !seen.has(edge.to)) queue.push(edge.to);
    }
  }
  return false;
}

export function addTaskGraphEdge(graph: SfiTaskGraph, edge: SfiTaskGraphEdge) {
  if (edge.from === edge.to || pathExists(graph, edge.to, edge.from)) {
    mutation(graph, 'LIMIT_BLOCKED', edge.to, null, {
      limit: 'DENY_CYCLE',
      reason: 'CYCLE_EDGE_ATTEMPT_BLOCKED',
      edge,
    });
    throw new Error(`TASK_GRAPH_CYCLE_EDGE_BLOCKED:${edge.from}:${edge.to}`);
  }
  if (graph.edges.some((candidate) => candidate.from === edge.from && candidate.to === edge.to && candidate.relation === edge.relation)) {
    return;
  }
  graph.edges.push(edge);
  mutation(graph, 'EDGE_ADDED', edge.to, null, { edge });
}

export function startPlannedTaskGraphNode(graph: SfiTaskGraph, nodeId: string) {
  const node = nodeById(graph, nodeId);
  if (!node) throw new Error(`TASK_GRAPH_NODE_NOT_FOUND:${nodeId}`);
  if (node.state !== 'PLANNED') return node.state === 'RUNNING';
  if (!reserveTaskGraphInvocation(graph, nodeId)) return false;
  transitionTaskGraphNode(graph, nodeId, 'ADMITTED');
  transitionTaskGraphNode(graph, nodeId, 'RUNNING');
  graph.status = 'running';
  return true;
}

export function finishRunningTaskGraphNode(input: {
  graph: SfiTaskGraph;
  nodeId: string;
  before: KernelContext;
  after: KernelContext;
  executed: boolean;
  executionReceiptRef?: string | null;
}) {
  const node = nodeById(input.graph, input.nodeId);
  if (!node) throw new Error(`TASK_GRAPH_NODE_NOT_FOUND:${input.nodeId}`);
  if (node.state !== 'RUNNING') throw new Error(`TASK_GRAPH_NODE_NOT_RUNNING:${node.nodeId}:${node.state}`);
  const outputs = newContextOutputRefs(input.before, input.after);
  transitionTaskGraphNode(input.graph, node.nodeId, input.executed ? 'COMPLETED' : 'FAILED', {
    outputRefs: unique([...node.outputRefs, ...outputs]),
    modelExecutionRef: modelExecutionRef(input.after, node.capabilityId),
    executionReceiptRef: input.executionReceiptRef ?? null,
  });
  return outputs;
}

export function activeTaskGraphNodeForCapability(graph: SfiTaskGraph, capabilityId: string) {
  return [...graph.nodes].reverse().find((node) => node.capabilityId === capabilityId && node.state !== 'SUPERSEDED') ?? null;
}

function nodeById(graph: SfiTaskGraph, nodeId: string | null) {
  return nodeId ? graph.nodes.find((node) => node.nodeId === nodeId) ?? null : null;
}

function ancestorNodes(graph: SfiTaskGraph, node: SfiTaskGraphNode) {
  return node.ancestorNodeIds
    .map((nodeId) => nodeById(graph, nodeId))
    .filter((candidate): candidate is SfiTaskGraphNode => Boolean(candidate));
}

export function ancestorCapabilityIds(graph: SfiTaskGraph, parentNodeId: string) {
  const parent = nodeById(graph, parentNodeId);
  if (!parent) return [];
  return unique([...ancestorNodes(graph, parent).map((node) => node.capabilityId), parent.capabilityId]);
}

function sourceFor(capabilityId: string) {
  return SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY.find((agent) => agent.id === capabilityId) ?? null;
}

function modelExecutionRef(context: KernelContext, capabilityId: string) {
  const insights = row(context.metadata?.agentInsights);
  const insight = row(insights[capabilityId]);
  for (const key of ['modelExecutionRef', 'executionId', 'responseId', 'requestId']) {
    const value = insight[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const llm = row(context.metadata?.llmRuntime);
  if (llm.lastAgentId === capabilityId) {
    for (const key of ['modelExecutionRef', 'executionId', 'responseId', 'requestId']) {
      const value = llm[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

function signalSnapshot(context: KernelContext): KernelContext {
  return {
    ...context,
    evidence: [...(context.evidence ?? [])],
    hypotheses: [...(context.hypotheses ?? [])],
    contradictions: [...(context.contradictions ?? [])],
    simulations: [...(context.simulations ?? [])],
    predictions: [...(context.predictions ?? [])],
    risks: [...(context.risks ?? [])],
    opportunities: [...(context.opportunities ?? [])],
    metadata: { ...context.metadata },
  };
}

function outputRefSet(context: KernelContext) {
  const values = new Set<string>();
  for (const item of context.evidence ?? []) values.add(`evidence:${item.id}`);
  for (const item of context.hypotheses ?? []) values.add(`hypothesis:${item.id}`);
  for (const item of context.predictions ?? []) values.add(`prediction:${item.id}`);
  for (const item of context.risks ?? []) values.add(`risk:${item.id}`);
  for (const item of context.opportunities ?? []) values.add(`opportunity:${item.id}`);
  (context.simulations ?? []).forEach((item, index) => values.add(`simulation:${item.simulator}:${index}`));
  return values;
}

export function newContextOutputRefs(before: KernelContext, after: KernelContext) {
  const prior = outputRefSet(before);
  return [...outputRefSet(after)].filter((ref) => !prior.has(ref));
}

function createRequestedNode(input: {
  graph: SfiTaskGraph;
  request: SfiCapabilityRequest;
  decision: SfiCapabilityBrokerDecision;
  parentNodeId: string;
  depth: number;
  state: SfiTaskGraphNodeState;
  requestEventId: string | null;
  dispositionEventId: string | null;
  supersedesNodeId?: string | null;
}) {
  const source = sourceFor(input.request.requestedCapabilityId);
  const parent = nodeById(input.graph, input.parentNodeId);
  if (!parent) throw new Error(`TASK_GRAPH_PARENT_NOT_FOUND:${input.parentNodeId}`);
  const nodeId = crypto.randomUUID();
  const node: SfiTaskGraphNode = {
    id: nodeId,
    agentId: input.request.requestedCapabilityId,
    label: source?.name ?? input.request.requestedCapabilityId,
    requiresEvidence: source?.sourceTables ?? [],
    authorityLevel: source?.authorityLevel ?? 'analyst',
    humanApprovalRequired: source?.humanApprovalRequired ?? false,
    nodeId,
    capabilityId: input.request.requestedCapabilityId,
    state: input.state,
    prerequisites: [input.parentNodeId],
    reason: input.request.reason,
    requestedBy: input.request.requestedByCapabilityId,
    inputRefs: unique(input.request.availableEvidenceRefs),
    outputRefs: [],
    modelExecutionRef: null,
    requestId: input.request.requestId,
    requestHash: input.decision.requestHash,
    requiredInputs: unique(input.request.requiredInputs),
    requestedOutputs: unique(input.request.requestedOutputs),
    urgency: input.request.urgency,
    parentNodeId: input.parentNodeId,
    ancestorNodeIds: unique([...parent.ancestorNodeIds, input.parentNodeId]),
    brokerDisposition: input.decision.disposition,
    requestEventId: input.requestEventId,
    dispositionEventId: input.dispositionEventId,
    executionReceiptRef: null,
    supersedesNodeId: input.supersedesNodeId ?? null,
    supersededByNodeId: null,
    depth: input.depth,
  };
  input.graph.nodes.push(node);
  mutation(input.graph, 'NODE_ADDED', node.nodeId, node.requestId, {
    capabilityId: node.capabilityId,
    state: node.state,
    depth: node.depth,
    brokerDisposition: node.brokerDisposition,
  });
  if (input.supersedesNodeId) {
    const previous = nodeById(input.graph, input.supersedesNodeId);
    if (!previous) throw new Error(`TASK_GRAPH_SUPERSEDED_NODE_NOT_FOUND:${input.supersedesNodeId}`);
    transitionTaskGraphNode(input.graph, previous.nodeId, 'SUPERSEDED', { supersededByNodeId: node.nodeId });
    mutation(input.graph, 'NODE_SUPERSEDED', previous.nodeId, previous.requestId, { supersededByNodeId: node.nodeId });
  }
  addTaskGraphEdge(input.graph, { from: input.parentNodeId, to: node.nodeId, relation: 'REQUIRES' });
  return node;
}

function updateExistingWaitingNode(
  graph: SfiTaskGraph,
  nodeId: string,
  runtime: SfiCapabilityRuntimeResult,
) {
  const node = nodeById(graph, nodeId);
  if (!node) return;
  node.inputRefs = unique(runtime.request.availableEvidenceRefs);
  node.requestHash = runtime.decision.requestHash;
  node.brokerDisposition = runtime.decision.disposition;
  node.requestEventId = runtime.requestEventId;
  node.dispositionEventId = runtime.dispositionEventId;
  mutation(graph, 'BROKER_DISPOSITION', node.nodeId, node.requestId, {
    disposition: runtime.decision.disposition,
    recheckedWaitingNode: true,
    reasons: runtime.decision.reasons,
  });
}

function recordBrokerMutation(graph: SfiTaskGraph, runtime: SfiCapabilityRuntimeResult, nodeId: string | null = null) {
  mutation(
    graph,
    runtime.decision.deduplicated ? 'REQUEST_REUSED' : 'BROKER_DISPOSITION',
    nodeId,
    runtime.request.requestId,
    {
      requestHash: runtime.decision.requestHash,
      disposition: runtime.decision.disposition,
      executionAllowed: runtime.decision.executionAllowed,
      deduplicated: runtime.decision.deduplicated,
      reasons: runtime.decision.reasons,
      requestEventId: runtime.requestEventId,
      dispositionEventId: runtime.dispositionEventId,
    },
  );
}

function pendingRequestHashes(graph: SfiTaskGraph, excludeNodeId: string | null = null) {
  return graph.nodes
    .filter((node) => node.nodeId !== excludeNodeId && PENDING_STATES.has(node.state) && Boolean(node.requestHash))
    .map((node) => node.requestHash!)
    .filter((hash, index, all) => all.indexOf(hash) === index);
}

function pendingCapabilityIds(graph: SfiTaskGraph, excludeNodeId: string | null = null) {
  return graph.nodes
    .filter((node) => node.nodeId !== excludeNodeId && PENDING_STATES.has(node.state))
    .map((node) => node.capabilityId)
    .filter((capabilityId, index, all) => all.indexOf(capabilityId) === index);
}

function completedCapabilityIds(graph: SfiTaskGraph) {
  return graph.nodes.filter((node) => node.state === 'COMPLETED').map((node) => node.capabilityId);
}

export type AdaptiveCapabilityRequestExecutor = (
  input: SfiCapabilityRuntimeInput,
) => Promise<SfiCapabilityRuntimeResult>;

export type AdaptiveTaskGraphExecutionResult = {
  context: KernelContext;
  graph: SfiTaskGraph;
  executedCapabilityIds: string[];
  informationChanged: boolean;
  stateChanged: boolean;
};

type ProcessRequestOptions = {
  context: KernelContext;
  graph: SfiTaskGraph;
  request: SfiCapabilityRequest;
  parentNodeId: string;
  depth: number;
  requestCapability: AdaptiveCapabilityRequestExecutor;
  supersedesNodeId?: string | null;
  existingWaitingNodeId?: string | null;
};

async function processRequest(options: ProcessRequestOptions): Promise<AdaptiveTaskGraphExecutionResult> {
  let { context, graph } = options;
  const mutationCountBefore = graph.mutations.length;
  const before = signalSnapshot(context);
  const requestedDepth = Math.max(0, Math.trunc(options.depth));
  let admittedNodeId: string | null = null;

  const runtime = await options.requestCapability({
    request: options.request,
    context: contextWithTaskGraph(context, graph),
    depth: requestedDepth,
    remainingInvocationBudget: graph.invocationBudget.remaining,
    alreadySatisfiedCapabilityIds: completedCapabilityIds(graph),
    ancestorCapabilityIds: ancestorCapabilityIds(graph, options.parentNodeId),
    pendingRequestHashes: pendingRequestHashes(graph, options.existingWaitingNodeId ?? null),
    pendingCapabilityIds: pendingCapabilityIds(graph, options.existingWaitingNodeId ?? null),
    onAdmitted: async (governedContext, decision, lineage) => {
      graph = taskGraphFromContext(governedContext) ?? graph;
      if (!reserveTaskGraphInvocation(graph, options.parentNodeId)) {
        throw new Error('CAPABILITY_INVOCATION_BUDGET_EXHAUSTED_AFTER_ADMISSION');
      }
      const node = createRequestedNode({
        graph,
        request: options.request,
        decision,
        parentNodeId: options.parentNodeId,
        depth: requestedDepth,
        state: 'PLANNED',
        requestEventId: lineage.requestEventId,
        dispositionEventId: lineage.dispositionEventId,
        supersedesNodeId: options.supersedesNodeId ?? null,
      });
      admittedNodeId = node.nodeId;
      transitionTaskGraphNode(graph, node.nodeId, 'ADMITTED');
      transitionTaskGraphNode(graph, node.nodeId, 'RUNNING');
      graph.status = 'running';
      return contextWithTaskGraph(governedContext, graph);
    },
  });

  graph = taskGraphFromContext(runtime.context) ?? graph;
  recordBrokerMutation(graph, runtime, admittedNodeId ?? options.existingWaitingNodeId ?? null);

  if (runtime.decision.disposition === 'EVIDENCE_REQUIRED' || runtime.decision.disposition === 'HUMAN_AUTHORITY_REQUIRED') {
    const waitingState: SfiTaskGraphNodeState = runtime.decision.disposition === 'EVIDENCE_REQUIRED'
      ? 'WAITING_EVIDENCE'
      : 'WAITING_AUTHORITY';
    if (options.existingWaitingNodeId) {
      updateExistingWaitingNode(graph, options.existingWaitingNodeId, runtime);
    } else {
      createRequestedNode({
        graph,
        request: runtime.request,
        decision: runtime.decision,
        parentNodeId: options.parentNodeId,
        depth: requestedDepth,
        state: waitingState,
        requestEventId: runtime.requestEventId,
        dispositionEventId: runtime.dispositionEventId,
      });
    }
    graph.status = 'waiting';
    return {
      context: contextWithTaskGraph(runtime.context, graph),
      graph,
      executedCapabilityIds: [],
      informationChanged: false,
      stateChanged: graph.mutations.length !== mutationCountBefore,
    };
  }

  if (runtime.decision.disposition !== 'ADMIT') {
    return {
      context: contextWithTaskGraph(runtime.context, graph),
      graph,
      executedCapabilityIds: [],
      informationChanged: false,
      stateChanged: graph.mutations.length !== mutationCountBefore,
    };
  }

  if (!admittedNodeId) throw new Error('ADMITTED_CAPABILITY_EXECUTED_WITHOUT_GRAPH_NODE');
  const node = nodeById(graph, admittedNodeId);
  if (!node) throw new Error(`ADMITTED_GRAPH_NODE_MISSING:${admittedNodeId}`);
  const outputs = newContextOutputRefs(before, runtime.context);
  const receiptRef = runtime.executionReceipt
    ? `${runtime.executionReceipt.eventName}:${runtime.executionReceipt.executionId}:${runtime.executionReceipt.capabilityId}`
    : null;
  transitionTaskGraphNode(graph, node.nodeId, runtime.executed ? 'COMPLETED' : 'FAILED', {
    outputRefs: unique([...node.outputRefs, ...outputs]),
    modelExecutionRef: modelExecutionRef(runtime.context, node.capabilityId),
    executionReceiptRef: receiptRef,
  });

  let nextContext = contextWithTaskGraph(runtime.context, graph);
  const executedCapabilityIds = runtime.executed ? [node.capabilityId] : [];
  let informationChanged = outputs.length > 0;
  let stateChanged = graph.mutations.length !== mutationCountBefore;

  if (runtime.executed) {
    const nested = await executeAdaptiveCapabilityRequestsForNode({
      context: nextContext,
      parentNodeId: node.nodeId,
      parentCapabilityId: node.capabilityId,
      requestCapability: options.requestCapability,
    });
    nextContext = nested.context;
    graph = nested.graph;
    executedCapabilityIds.push(...nested.executedCapabilityIds);
    informationChanged = informationChanged || nested.informationChanged;
    stateChanged = stateChanged || nested.stateChanged;
  }

  return {
    context: contextWithTaskGraph(nextContext, graph),
    graph,
    executedCapabilityIds: unique(executedCapabilityIds),
    informationChanged,
    stateChanged,
  };
}

export async function executeAdaptiveCapabilityRequestsForNode(input: {
  context: KernelContext;
  parentNodeId: string;
  parentCapabilityId: string;
  requestCapability?: AdaptiveCapabilityRequestExecutor;
}): Promise<AdaptiveTaskGraphExecutionResult> {
  let context = input.context;
  let graph = taskGraphFromContext(context);
  if (!graph) throw new Error('ADAPTIVE_TASK_GRAPH_REQUIRED');
  const parent = nodeById(graph, input.parentNodeId);
  if (!parent) throw new Error(`TASK_GRAPH_PARENT_NOT_FOUND:${input.parentNodeId}`);
  const requests = capabilityRequestsFromContext(context, input.parentCapabilityId);
  const requestCapability = input.requestCapability ?? ((runtimeInput) => requestCognitiveCapability(runtimeInput));
  const executedCapabilityIds: string[] = [];
  let informationChanged = false;
  let stateChanged = false;

  for (const request of requests) {
    const represented = graph.nodes.find((node) => node.requestId === request.requestId && node.state !== 'SUPERSEDED');
    if (represented) continue;
    const result = await processRequest({
      context,
      graph,
      request,
      parentNodeId: input.parentNodeId,
      depth: parent.depth + 1,
      requestCapability,
    });
    context = result.context;
    graph = result.graph;
    executedCapabilityIds.push(...result.executedCapabilityIds);
    informationChanged = informationChanged || result.informationChanged;
    stateChanged = stateChanged || result.stateChanged;
    if (graph.stop.stopped) break;
  }

  return {
    context: contextWithTaskGraph(context, graph),
    graph,
    executedCapabilityIds: unique(executedCapabilityIds),
    informationChanged,
    stateChanged,
  };
}

export async function resumeWaitingAdaptiveCapabilities(input: {
  context: KernelContext;
  requestCapability?: AdaptiveCapabilityRequestExecutor;
}): Promise<AdaptiveTaskGraphExecutionResult> {
  let context = input.context;
  let graph = taskGraphFromContext(context);
  if (!graph) {
    throw new Error('ADAPTIVE_TASK_GRAPH_REQUIRED');
  }
  const requestCapability = input.requestCapability ?? ((runtimeInput) => requestCognitiveCapability(runtimeInput));
  const executedCapabilityIds: string[] = [];
  let informationChanged = false;
  let stateChanged = false;
  const currentEvidenceRefs = unique((context.evidence ?? []).map((item) => item.id));
  const waitingNodes = graph.nodes.filter((node) => node.state === 'WAITING_EVIDENCE');

  for (const waiting of waitingNodes) {
    const hasNewEvidence = currentEvidenceRefs.some((ref) => !waiting.inputRefs.includes(ref));
    if (!hasNewEvidence) continue;
    if (!waiting.requestId || !waiting.requestedBy || !waiting.parentNodeId || !waiting.urgency) continue;

    const request: SfiCapabilityRequest = {
      requestId: waiting.requestId,
      trajectoryId: context.cycleId,
      parentStepId: waiting.parentNodeId,
      requestedByCapabilityId: waiting.requestedBy,
      requestedCapabilityId: waiting.capabilityId,
      reason: waiting.reason,
      requiredInputs: waiting.requiredInputs,
      availableEvidenceRefs: currentEvidenceRefs,
      requestedOutputs: waiting.requestedOutputs,
      urgency: waiting.urgency,
      requestedAt: new Date().toISOString(),
    };

    const result = await processRequest({
      context,
      graph,
      request,
      parentNodeId: waiting.parentNodeId,
      depth: waiting.depth,
      requestCapability,
      supersedesNodeId: waiting.nodeId,
      existingWaitingNodeId: waiting.nodeId,
    });
    context = result.context;
    graph = result.graph;
    executedCapabilityIds.push(...result.executedCapabilityIds);
    informationChanged = informationChanged || result.informationChanged;
    stateChanged = stateChanged || result.stateChanged;
    if (graph.stop.stopped) break;
  }

  return {
    context: contextWithTaskGraph(context, graph),
    graph,
    executedCapabilityIds: unique(executedCapabilityIds),
    informationChanged,
    stateChanged,
  };
}

export function unresolvedRequiredCapabilityCount(graph: SfiTaskGraph) {
  return graph.nodes.filter((node) =>
    node.state === 'WAITING_EVIDENCE'
    || node.state === 'WAITING_AUTHORITY'
    || node.state === 'ADMITTED'
    || node.state === 'RUNNING'
  ).length;
}

export function evaluateAdaptiveStopInvariant(input: {
  informationChanged: boolean;
  stateChanged: boolean;
  unresolvedRequiredCapabilities: number;
}) {
  const stop = !input.informationChanged
    && !input.stateChanged
    && input.unresolvedRequiredCapabilities === 0;
  return {
    stop,
    reason: stop
      ? 'NO_NEW_INFORMATION_AND_NO_NEW_STATE_AND_NO_UNRESOLVED_REQUIRED_CAPABILITY'
      : null,
  } as const;
}

export function markAdaptiveStop(graph: SfiTaskGraph, reason: string) {
  graph.stop = { stopped: true, reason, evaluatedAt: new Date().toISOString() };
  graph.status = 'stopped';
  mutation(graph, 'STOPPED', null, null, { reason });
}

export function pendingEquivalentRequestHash(graph: SfiTaskGraph, request: SfiCapabilityRequest) {
  const hash = capabilityRequestHash(request);
  return graph.nodes.some((node) => PENDING_STATES.has(node.state) && node.requestHash === hash) ? hash : null;
}
