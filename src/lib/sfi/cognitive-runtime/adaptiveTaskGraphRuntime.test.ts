import test from 'node:test';
import assert from 'node:assert/strict';

import {
  capabilityRequestHash,
  evaluateCapabilityRequest,
  type SfiCapabilityHistoryEntry,
  type SfiCapabilityRequest,
} from './capabilityBroker';
import {
  requestCognitiveCapability,
  type SfiCapabilityRuntimeInput,
} from './capabilityRuntime';
import { selectCognitiveAutomations } from './automationSelector';
import {
  cognitiveCheckpointEventInput,
  mergeCheckpointContext,
  SFI_UNIVERSAL_COGNITIVE_CHECKPOINT,
} from './cognitiveCycle';
import {
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  activeTaskGraphNodeForCapability,
  addTaskGraphEdge,
  contextWithTaskGraph,
  evaluateAdaptiveStopInvariant,
  executeAdaptiveCapabilityRequestsForNode,
  reserveTaskGraphInvocation,
  resumeWaitingAdaptiveCapabilities,
  taskGraphFromContext,
  transitionTaskGraphNode,
  validateTaskGraphInvocationBudget,
  validateTaskGraphTransition,
} from './adaptiveTaskGraphRuntime';
import { buildTaskGraph } from './taskGraphBuilder';
import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import type { KernelContext } from './kernelContext';

function context(overrides: Partial<KernelContext> = {}): KernelContext {
  return {
    cycleId: 'trajectory-adaptive',
    logbookId: 'logbook-adaptive',
    taskId: 'task-adaptive',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [], hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [],
    metadata: {},
    ...overrides,
  };
}

function plan(requiredAgents: string[] = [], selectionMode: CognitiveTaskPlan['selectionMode'] = 'auto'): CognitiveTaskPlan {
  return {
    taskId: 'task-adaptive', requiredAgents, executionOrder: ['meta_orchestrator', ...requiredAgents], missingInputs: [],
    readiness: 1, selectionMode, selectionReasons: Object.fromEntries(requiredAgents.map((id) => [id, ['test']])),
  };
}

function request(overrides: Partial<SfiCapabilityRequest> = {}): SfiCapabilityRequest {
  return {
    requestId: 'adaptive-request-1', trajectoryId: 'trajectory-adaptive', parentStepId: null,
    requestedByCapabilityId: 'meta_orchestrator', requestedCapabilityId: 'risk_agent',
    reason: 'Bounded adaptive analysis required by the running capability.', requiredInputs: [], availableEvidenceRefs: [],
    requestedOutputs: ['RECOMMENDATION'], urgency: 'NORMAL', requestedAt: '2026-09-06T15:10:00.000Z', ...overrides,
  };
}

function graphContext() {
  const graph = buildTaskGraph(plan());
  const root = activeTaskGraphNodeForCapability(graph, 'meta_orchestrator');
  assert.ok(root);
  transitionTaskGraphNode(graph, root.nodeId, 'ADMITTED');
  transitionTaskGraphNode(graph, root.nodeId, 'RUNNING');
  graph.invocationBudget.used = 1;
  graph.invocationBudget.remaining = graph.invocationBudget.max - 1;
  transitionTaskGraphNode(graph, root.nodeId, 'COMPLETED');
  return { graph, root, ctx: contextWithTaskGraph(context(), graph) };
}

function runtimeExecutor(options: {
  history?: SfiCapabilityHistoryEntry[];
  executions?: { value: number };
  order?: string[];
  onExecute?: (agentId: string, ctx: KernelContext) => KernelContext;
} = {}) {
  let eventCounter = 0;
  return async (input: SfiCapabilityRuntimeInput) => requestCognitiveCapability(input, {
    readHistory: async () => options.history ?? [],
    appendEvent: async (event) => {
      options.order?.push(`event:${String(event.eventName)}`);
      return { ok: true as const, eventId: `event-${++eventCounter}` };
    },
    executeAgent: async (agentId, ctx) => {
      if (options.executions) options.executions.value += 1;
      options.order?.push(`execute:${agentId}`);
      return { agentId, executed: true, context: options.onExecute ? options.onExecute(agentId, ctx) : ctx, executedAt: '2026-09-06T15:11:00.000Z' };
    },
  });
}

function rawGraphContext(graph: unknown): KernelContext {
  return context({ metadata: { taskGraph: graph } });
}

test('graph contract preserves adaptive DAG vocabulary and validated state transitions', () => {
  const graph = buildTaskGraph(plan(['field_observer', 'risk_agent'], 'explicit'));
  const root = activeTaskGraphNodeForCapability(graph, 'meta_orchestrator');
  assert.ok(root);
  assert.equal(graph.mode, 'ADAPTIVE');
  assert.equal(graph.initialSelectionMode, 'explicit');
  assert.ok(graph.edges.every((edge) => edge.from === root.nodeId));
  assert.ok(graph.edges.some((edge) => edge.relation === 'REQUIRES'));
  assert.ok(graph.edges.some((edge) => edge.relation === 'GOVERNS'));
  assert.equal(validateTaskGraphTransition('PLANNED', 'ADMITTED'), true);
  assert.equal(validateTaskGraphTransition('ADMITTED', 'RUNNING'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'COMPLETED'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'WAITING_EVIDENCE'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'WAITING_AUTHORITY'), true);
  assert.equal(validateTaskGraphTransition('RUNNING', 'FAILED'), true);
  assert.equal(validateTaskGraphTransition('COMPLETED', 'RUNNING'), false);
});

test('ADMIT creates a bounded child with parent/request lineage and execution starts only after Broker ADMIT', async () => {
  const { ctx, root } = graphContext();
  const req = request({ parentStepId: root.nodeId });
  const executions = { value: 0 };
  const order: string[] = [];
  const result = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } },
    parentNodeId: root.nodeId,
    parentCapabilityId: 'meta_orchestrator',
    requestCapability: runtimeExecutor({ executions, order, onExecute: (agentId, executingContext) => {
      assert.equal(agentId, 'risk_agent');
      const executingGraph = taskGraphFromContext(executingContext);
      const child = executingGraph?.nodes.find((node) => node.requestId === req.requestId);
      assert.equal(child?.state, 'RUNNING');
      assert.equal(child?.brokerDisposition, 'ADMIT');
      return executingContext;
    } }),
  });
  const child = result.graph.nodes.find((node) => node.requestId === req.requestId);
  assert.equal(executions.value, 1);
  assert.deepEqual(order, ['event:SFI_CAPABILITY_REQUESTED', 'event:SFI_CAPABILITY_ADMITTED', 'execute:risk_agent']);
  assert.ok(child);
  assert.equal(child.state, 'COMPLETED');
  assert.equal(child.parentNodeId, root.nodeId);
  assert.deepEqual(child.ancestorNodeIds, [root.nodeId]);
  assert.equal(child.requestId, req.requestId);
  assert.equal(child.requestHash, capabilityRequestHash(req));
  assert.match(child.executionReceiptRef ?? '', /^SFI_AGENT_EXECUTED:/);
});

test('DENY never creates or executes child work', async () => {
  const { ctx, root } = graphContext();
  const req = request({ parentStepId: root.nodeId, requestedCapabilityId: 'not_registered' });
  const executions = { value: 0 };
  const result = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } }, parentNodeId: root.nodeId,
    parentCapabilityId: 'meta_orchestrator', requestCapability: runtimeExecutor({ executions }),
  });
  assert.equal(executions.value, 0);
  assert.equal(result.executedCapabilityIds.length, 0);
  assert.equal(result.graph.nodes.some((node) => node.requestId === req.requestId), false);
  assert.ok(result.graph.mutations.some((item) => item.kind === 'BROKER_DISPOSITION' && item.detail.disposition === 'DENY'));
});

test('EVIDENCE_REQUIRED waits, valid new evidence reevaluates, and reentry preserves supersession lineage', async () => {
  const { ctx, root } = graphContext();
  const req = request({ requestId: 'evidence-request', parentStepId: root.nodeId, requestedCapabilityId: 'reality_calibration' });
  const executions = { value: 0 };
  const first = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } }, parentNodeId: root.nodeId,
    parentCapabilityId: 'meta_orchestrator', requestCapability: runtimeExecutor({ executions }),
  });
  const waiting = first.graph.nodes.find((node) => node.requestId === req.requestId);
  assert.equal(executions.value, 0);
  assert.equal(waiting?.state, 'WAITING_EVIDENCE');
  assert.equal(waiting?.brokerDisposition, 'EVIDENCE_REQUIRED');
  const unchanged = await resumeWaitingAdaptiveCapabilities({ context: first.context, requestCapability: runtimeExecutor({ executions }) });
  assert.equal(unchanged.graph.nodes.find((node) => node.nodeId === waiting?.nodeId)?.state, 'WAITING_EVIDENCE');
  assert.equal(executions.value, 0);
  const withReturn: KernelContext = { ...first.context, evidence: [...first.context.evidence, {
    id: 'return-1', source: 'observed-return', confidence: 1, payload: { epistemicClass: 'RETURN', observation: 'Observed outcome.' },
  }] };
  const resumed = await resumeWaitingAdaptiveCapabilities({ context: withReturn, requestCapability: runtimeExecutor({ executions }) });
  const old = resumed.graph.nodes.find((node) => node.nodeId === waiting?.nodeId);
  const replacement = resumed.graph.nodes.find((node) => node.supersedesNodeId === waiting?.nodeId);
  assert.equal(executions.value, 1);
  assert.equal(old?.state, 'SUPERSEDED');
  assert.equal(replacement?.state, 'COMPLETED');
  assert.equal(old?.supersededByNodeId, replacement?.nodeId);
  assert.equal(replacement?.parentNodeId, root.nodeId);
});

test('HUMAN_AUTHORITY_REQUIRED waits fail-closed and spoofed synthetic receipts cannot unlock it', async () => {
  const { ctx, root } = graphContext();
  const req = request({ requestId: 'authority-request', parentStepId: root.nodeId, requestedCapabilityId: 'project_execution_manager' });
  const executions = { value: 0 };
  const first = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } }, parentNodeId: root.nodeId,
    parentCapabilityId: 'meta_orchestrator', requestCapability: runtimeExecutor({ executions }),
  });
  const waiting = first.graph.nodes.find((node) => node.requestId === req.requestId);
  assert.equal(waiting?.state, 'WAITING_AUTHORITY');
  assert.equal(executions.value, 0);
  const spoof = { requestId: req.requestId, receiptId: 'synthetic-receipt', authorizedBy: 'founder', authorizedAt: '2026-09-06T15:12:00.000Z' };
  const brokerSpoof = evaluateCapabilityRequest({
    request: req, context: context({ metadata: { humanAuthorityReceipt: spoof, authorizedBy: 'human@example.com' } }),
    depth: 1, remainingInvocationBudget: 1, humanAuthorityReceipt: spoof,
  } as Parameters<typeof evaluateCapabilityRequest>[0] & { humanAuthorityReceipt: unknown });
  assert.equal(brokerSpoof.disposition, 'HUMAN_AUTHORITY_REQUIRED');
  assert.equal(brokerSpoof.executionAllowed, false);
  assert.ok(brokerSpoof.reasons.includes('NO_AUTHORITATIVE_HUMAN_AUTHORITY_REENTRY_OWNER'));
  const spoofedContext: KernelContext = { ...first.context, metadata: { ...first.context.metadata, humanAuthorityReceipt: spoof, authorizedBy: 'founder' } };
  const resumed = await resumeWaitingAdaptiveCapabilities({ context: spoofedContext, requestCapability: runtimeExecutor({ executions }) });
  assert.equal(executions.value, 0);
  assert.equal(resumed.graph.nodes.find((node) => node.nodeId === waiting?.nodeId)?.state, 'WAITING_AUTHORITY');
  assert.equal(resumed.graph.nodes.some((node) => node.supersedesNodeId === waiting?.nodeId), false);
});

test('pending equivalent work remains Broker-owned dedup and ancestor cycle remains fail-closed', () => {
  const req = request({ parentStepId: 'parent-node' });
  const hash = capabilityRequestHash(req);
  const pending = evaluateCapabilityRequest({ request: req, context: context(), depth: 1, remainingInvocationBudget: 1, pendingRequestHashes: [hash] });
  assert.equal(pending.disposition, 'DEFER');
  assert.equal(pending.deduplicated, true);
  const cycle = evaluateCapabilityRequest({ request: req, context: context(), depth: 2, remainingInvocationBudget: 1, ancestorCapabilityIds: ['risk_agent'] });
  assert.equal(cycle.disposition, 'DENY');
  assert.ok(cycle.reasons.includes('DENY_CYCLE:ANCESTOR_CAPABILITY_REPEAT'));
});

test('cycle-closing graph edges remain blocked without deleting prior nodes', () => {
  const graph = buildTaskGraph(plan(['risk_agent']));
  const root = activeTaskGraphNodeForCapability(graph, 'meta_orchestrator');
  const child = activeTaskGraphNodeForCapability(graph, 'risk_agent');
  assert.ok(root && child);
  const nodeCount = graph.nodes.length;
  assert.throws(() => addTaskGraphEdge(graph, { from: child.nodeId, to: root.nodeId, relation: 'SUPPLIES' }), /TASK_GRAPH_CYCLE_EDGE_BLOCKED/);
  assert.equal(graph.nodes.length, nodeCount);
});

test('absolute trajectory ceiling consumes invocation 25 and blocks invocation 26', () => {
  const graph = buildTaskGraph(plan());
  const root = activeTaskGraphNodeForCapability(graph, 'meta_orchestrator');
  assert.ok(root);
  assert.equal(graph.invocationBudget.max, SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS);
  graph.invocationBudget.used = 24;
  graph.invocationBudget.remaining = 1;
  assert.deepEqual(validateTaskGraphInvocationBudget(graph), []);
  assert.equal(reserveTaskGraphInvocation(graph, root.nodeId), true);
  assert.deepEqual(graph.invocationBudget, { max: 25, used: 25, remaining: 0 });
  assert.equal(reserveTaskGraphInvocation(graph, root.nodeId), false);
  assert.equal(graph.stop.stopped, true);
  assert.equal(graph.stop.reason, 'MAX_CAPABILITY_INVOCATIONS_REACHED');
});

test('restored budgets cannot expand ceiling or carry corrupt counters, while stricter ceilings remain valid', () => {
  const expanded = buildTaskGraph(plan());
  expanded.invocationBudget = { max: 26, used: 0, remaining: 26 };
  assert.throws(() => taskGraphFromContext(rawGraphContext(expanded)), /TASK_GRAPH_INVOCATION_BUDGET_INVALID:.*MAX_EXCEEDS_ABSOLUTE_TRAJECTORY_LIMIT:26:25/);
  const inconsistent = buildTaskGraph(plan());
  inconsistent.invocationBudget = { max: 25, used: 3, remaining: 23 };
  assert.throws(() => taskGraphFromContext(rawGraphContext(inconsistent)), /TASK_GRAPH_INVOCATION_BUDGET_INVALID:.*REMAINING_MISMATCH:23:22/);
  const negative = buildTaskGraph(plan());
  negative.invocationBudget = { max: 25, used: -1, remaining: 26 };
  assert.throws(() => taskGraphFromContext(rawGraphContext(negative)), /TASK_GRAPH_INVOCATION_BUDGET_INVALID:.*USED_MUST_NOT_BE_NEGATIVE/);
  const stricter = buildTaskGraph(plan());
  stricter.invocationBudget = { max: 10, used: 4, remaining: 6 };
  assert.equal(taskGraphFromContext(rawGraphContext(stricter))?.invocationBudget.max, 10);
});

test('real checkpoint event-input writes taskGraph budget/history and production restore preserves used budget and supersession', async () => {
  const { ctx, root } = graphContext();
  const req = request({ requestId: 'checkpoint-evidence-request', parentStepId: root.nodeId, requestedCapabilityId: 'reality_calibration' });
  const first = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } }, parentNodeId: root.nodeId,
    parentCapabilityId: 'meta_orchestrator', requestCapability: runtimeExecutor(),
  });
  const waiting = first.graph.nodes.find((node) => node.requestId === req.requestId);
  assert.equal(waiting?.state, 'WAITING_EVIDENCE');
  const withReturn: KernelContext = { ...first.context, evidence: [...first.context.evidence, {
    id: 'return-checkpoint', source: 'observed-return', confidence: 1, payload: { epistemicClass: 'RETURN' },
  }] };
  const resumed = await resumeWaitingAdaptiveCapabilities({ context: withReturn, requestCapability: runtimeExecutor() });
  const beforeGraph = taskGraphFromContext(resumed.context);
  assert.ok(beforeGraph);
  const beforeUsed = beforeGraph.invocationBudget.used;
  const old = beforeGraph.nodes.find((node) => node.nodeId === waiting?.nodeId);
  const replacement = beforeGraph.nodes.find((node) => node.supersedesNodeId === waiting?.nodeId);
  assert.equal(old?.state, 'SUPERSEDED');
  assert.ok(replacement);
  const eventInput = cognitiveCheckpointEventInput({
    context: resumed.context, processedAgents: ['meta_orchestrator'], executedAgents: ['meta_orchestrator', 'reality_calibration'],
    missingAgents: [], completed: false, source: 'adaptive-task-graph-test',
  });
  assert.equal(eventInput.eventName, SFI_UNIVERSAL_COGNITIVE_CHECKPOINT);
  assert.equal(eventInput.source.sourceType, 'cognitive_runtime_checkpoint');
  const eventPayload = JSON.parse(JSON.stringify(eventInput.payload)) as { context: KernelContext; storagePolicy: string };
  const writtenGraph = taskGraphFromContext(eventPayload.context);
  assert.ok(writtenGraph);
  assert.equal(eventPayload.storagePolicy, 'DURABLE_COGNITIVE_STATE_NO_RAW_SOURCE_ROWS');
  assert.equal(writtenGraph.invocationBudget.used, beforeUsed);
  assert.equal(writtenGraph.nodes.find((node) => node.nodeId === old?.nodeId)?.state, 'SUPERSEDED');
  assert.equal(writtenGraph.nodes.find((node) => node.nodeId === old?.nodeId)?.supersededByNodeId, replacement.nodeId);
  const restored = mergeCheckpointContext(context(), eventPayload.context);
  const restoredGraph = taskGraphFromContext(restored);
  assert.ok(restoredGraph);
  assert.equal(restoredGraph.invocationBudget.used, beforeUsed);
  assert.equal(restoredGraph.invocationBudget.remaining, beforeGraph.invocationBudget.remaining);
  assert.equal(restoredGraph.nodes.find((node) => node.nodeId === old?.nodeId)?.state, 'SUPERSEDED');
  assert.equal(restoredGraph.nodes.find((node) => node.nodeId === replacement.nodeId)?.supersedesNodeId, old?.nodeId);
  assert.ok(restoredGraph.mutations.some((mutation) => mutation.kind === 'NODE_SUPERSEDED'));
});

test('production checkpoint restore rejects an expanded trajectory ceiling instead of resetting or normalizing it', () => {
  const graph = buildTaskGraph(plan());
  graph.invocationBudget = { max: 26, used: 2, remaining: 24 };
  const checkpoint = context({ metadata: { taskGraph: graph } });
  assert.throws(() => mergeCheckpointContext(context(), checkpoint), /TASK_GRAPH_INVOCATION_BUDGET_INVALID:.*MAX_EXCEEDS_ABSOLUTE_TRAJECTORY_LIMIT:26:25/);
});

test('maxDepth continues to come from Cognitive Passport and deeper graph depth never elevates authority', () => {
  const tooDeep = evaluateCapabilityRequest({ request: request(), context: context(), depth: 3, remainingInvocationBudget: 1 });
  assert.equal(tooDeep.disposition, 'DEFER');
  assert.ok(tooDeep.reasons.includes('MAX_DEPTH_REACHED:3:2'));
  const authority = evaluateCapabilityRequest({
    request: request({ requestedByCapabilityId: 'field_observer', requestedCapabilityId: 'risk_agent' }),
    context: context(), depth: 2, remainingInvocationBudget: 1,
  });
  assert.equal(authority.disposition, 'DENY');
  assert.ok(authority.reasons.some((reason) => reason.startsWith('AUTHORITY_CEILING_EXCEEDED:READ:RECOMMEND')));
});

test('EXPLICIT and AUTO selection remain unchanged; ADAPTIVE extends runtime only', () => {
  const explicit = selectCognitiveAutomations(context({ metadata: { requestedAgents: ['risk_agent'] } }));
  assert.equal(explicit.mode, 'explicit');
  assert.deepEqual(explicit.automationIds, ['risk_agent']);
  const auto = selectCognitiveAutomations(context({ metadata: { question: 'What evidence is available?' } }));
  assert.equal(auto.mode, 'auto');
  assert.ok(auto.automationIds.includes('field_observer'));
  assert.ok(auto.automationIds.includes('evidence_hunter'));
  assert.equal(buildTaskGraph(plan(['risk_agent'], explicit.mode)).initialSelectionMode, 'explicit');
  assert.equal(buildTaskGraph(plan(['risk_agent'], auto.mode)).initialSelectionMode, 'auto');
});

test('stop invariant remains exact and unresolved WAITING_AUTHORITY prevents stop', async () => {
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: 0 }).stop, true);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: true, stateChanged: false, unresolvedRequiredCapabilities: 0 }).stop, false);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: true, unresolvedRequiredCapabilities: 0 }).stop, false);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: 1 }).stop, false);
  const { ctx, root } = graphContext();
  const req = request({ requestId: 'stop-authority-request', parentStepId: root.nodeId, requestedCapabilityId: 'project_execution_manager' });
  const waiting = await executeAdaptiveCapabilityRequestsForNode({
    context: { ...ctx, metadata: { ...ctx.metadata, capabilityRequests: [req] } },
    parentNodeId: root.nodeId, parentCapabilityId: 'meta_orchestrator', requestCapability: runtimeExecutor(),
  });
  const unresolved = waiting.graph.nodes.filter((node) => node.state === 'WAITING_AUTHORITY').length;
  assert.equal(unresolved, 1);
  assert.equal(evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: unresolved }).stop, false);
});
