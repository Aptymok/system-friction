import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addTaskGraphEdge,
  executeAdaptiveCapabilityRequestsForNode,
  isTaskGraphStructuralAncestryEdge,
  markAdaptiveStop,
  pendingEquivalentRequestHash,
  reserveTaskGraphInvocation,
  taskGraphFromContext,
  unresolvedRequiredCapabilityCount,
  validateTaskGraphStructure,
} from './adaptiveTaskGraphRuntime';
import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import { capabilityRequestHash, type SfiCapabilityRequest } from './capabilityBroker';
import type { KernelContext } from './kernelContext';
import { runCognitiveAgent } from './runtimeAgentExecutor';
import {
  observeRuntimeModelTelemetry,
  reserveRuntimeModelCall,
  runtimeExecutionPreflight,
} from './runtimeStopControls';
import { buildTaskGraph } from './taskGraphBuilder';
import type { SfiTaskGraph, SfiTaskGraphEdgeRelation, SfiTaskGraphNode } from './types';

function plan(): CognitiveTaskPlan {
  return {
    taskId: 'runtime-r4-assurance',
    requiredAgents: ['risk_agent', 'opportunity_agent'],
    executionOrder: ['meta_orchestrator', 'risk_agent', 'opportunity_agent'],
    missingInputs: [],
    readiness: 1,
    selectionMode: 'auto',
    selectionReasons: { risk_agent: ['test'], opportunity_agent: ['test'] },
  };
}

function contextWithGraph(limits: Parameters<typeof buildTaskGraph>[1] = {}): KernelContext {
  const graph = buildTaskGraph(plan(), limits);
  return {
    cycleId: 'runtime-r4-cycle',
    logbookId: 'runtime-r4-logbook',
    taskId: 'runtime-r4-assurance',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [], hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [],
    metadata: { taskGraph: graph },
  };
}

function graph(context: KernelContext) {
  return context.metadata.taskGraph as ReturnType<typeof buildTaskGraph>;
}

function startMs(context: KernelContext) {
  return Date.parse(graph(context).runtimeControls.bounds.startedAt);
}

function cloneGraph(context: KernelContext) {
  return JSON.parse(JSON.stringify(graph(context))) as SfiTaskGraph;
}

function nodes(context: KernelContext) {
  const g = graph(context);
  const root = g.nodes.find((node) => node.capabilityId === 'meta_orchestrator');
  const risk = g.nodes.find((node) => node.capabilityId === 'risk_agent');
  const opportunity = g.nodes.find((node) => node.capabilityId === 'opportunity_agent');
  assert.ok(root && risk && opportunity);
  return { root, risk, opportunity };
}

function appendChild(target: SfiTaskGraph, parent: SfiTaskGraphNode, nodeId: string, depth: number) {
  const node: SfiTaskGraphNode = {
    ...parent,
    id: nodeId,
    nodeId,
    agentId: 'risk_agent',
    capabilityId: 'risk_agent',
    label: nodeId,
    state: 'PLANNED',
    prerequisites: [parent.nodeId],
    reason: 'structural child',
    requestedBy: parent.capabilityId,
    inputRefs: [],
    outputRefs: [],
    modelExecutionRef: null,
    requestId: null,
    requestHash: null,
    requiredInputs: [],
    requestedOutputs: [],
    urgency: null,
    parentNodeId: parent.nodeId,
    ancestorNodeIds: [...parent.ancestorNodeIds, parent.nodeId],
    brokerDisposition: null,
    requestEventId: null,
    dispositionEventId: null,
    executionReceiptRef: null,
    supersedesNodeId: null,
    supersededByNodeId: null,
    depth,
  };
  target.nodes.push(node);
  return node;
}

function request(id: string, requestedByCapabilityId = 'risk_agent'): SfiCapabilityRequest {
  return {
    requestId: id,
    trajectoryId: 'runtime-r4-cycle',
    parentStepId: null,
    requestedByCapabilityId,
    requestedCapabilityId: 'evidence_hunter',
    reason: 'assurance capability request',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['EVIDENCE'],
    urgency: 'NORMAL',
    requestedAt: '2026-09-07T04:00:00.000Z',
  };
}

function withRequests(context: KernelContext, requests: SfiCapabilityRequest[]) {
  context.metadata = { ...context.metadata, capabilityRequests: requests };
  return context;
}

function attachCurrentTelemetry(context: KernelContext, values: Record<string, unknown>) {
  const prior = context.metadata?.llmRuntime && typeof context.metadata.llmRuntime === 'object' && !Array.isArray(context.metadata.llmRuntime)
    ? context.metadata.llmRuntime as Record<string, unknown>
    : {};
  const callId = typeof prior.runtimeModelCallId === 'string' ? prior.runtimeModelCallId : null;
  context.metadata = {
    ...context.metadata,
    llmRuntime: {
      ...prior,
      ...values,
      telemetryRuntimeModelCallId: callId,
    },
  };
}

const semanticSiblingRelations: SfiTaskGraphEdgeRelation[] = ['CONTRADICTS', 'CALIBRATES', 'SUPPLIES'];
const allRelations: SfiTaskGraphEdgeRelation[] = ['REQUIRES', 'SUPPLIES', 'CONTRADICTS', 'CALIBRATES', 'GOVERNS', 'FALSIFIES'];

test('F-406-05: semantic sibling CONTRADICTS/CALIBRATES/SUPPLIES never fabricate trajectory depth', () => {
  const ctx = contextWithGraph();
  const g = graph(ctx);
  const { risk, opportunity } = nodes(ctx);
  assert.equal(risk.depth, 1);
  assert.equal(opportunity.depth, 1);
  for (const relation of semanticSiblingRelations) {
    const edge = { from: risk.nodeId, to: opportunity.nodeId, relation } as const;
    addTaskGraphEdge(g, edge);
    assert.equal(isTaskGraphStructuralAncestryEdge(g, edge), false);
    assert.deepEqual(validateTaskGraphStructure(g), []);
    assert.equal(risk.depth, 1);
    assert.equal(opportunity.depth, 1);
  }
});

test('F-406-05: writer-accepted relation mutations remain validator-acceptable', () => {
  const ctx = contextWithGraph();
  const g = graph(ctx);
  const { risk, opportunity } = nodes(ctx);
  for (const relation of allRelations) {
    addTaskGraphEdge(g, { from: risk.nodeId, to: opportunity.nodeId, relation });
    assert.deepEqual(validateTaskGraphStructure(g), [], `writer/validator contradiction after ${relation}`);
  }
});

test('F-406-05: real parent-child lineage increments depth while forged structural depth fails', () => {
  const ctx = contextWithGraph();
  const g = graph(ctx);
  const { risk } = nodes(ctx);
  const child = appendChild(g, risk, 'structural-level-2', 2);
  const edge = { from: risk.nodeId, to: child.nodeId, relation: 'REQUIRES' as const };
  addTaskGraphEdge(g, edge);
  assert.equal(isTaskGraphStructuralAncestryEdge(g, edge), true);
  assert.deepEqual(validateTaskGraphStructure(g), []);
  const forged = cloneGraph(ctx);
  const forgedParent = forged.nodes.find((node) => node.nodeId === risk.nodeId)!;
  const forgedChild = appendChild(forged, forgedParent, 'forged-level-2', 1);
  forged.edges.push({ from: forgedParent.nodeId, to: forgedChild.nodeId, relation: 'REQUIRES' });
  assert.ok(validateTaskGraphStructure(forged).some((error) => error.startsWith('DEPTH_MISMATCH:forged-level-2:1:2')));
});

test('F-406-05: parent ancestry cycles fail independently of semantic depth and dangling semantic endpoints fail at writer', () => {
  const ctx = contextWithGraph();
  const corrupt = cloneGraph(ctx);
  const root = corrupt.nodes.find((node) => node.capabilityId === 'meta_orchestrator')!;
  const risk = corrupt.nodes.find((node) => node.capabilityId === 'risk_agent')!;
  root.parentNodeId = risk.nodeId;
  root.ancestorNodeIds = [risk.nodeId];
  root.prerequisites = [risk.nodeId];
  root.depth = 2;
  corrupt.edges.push({ from: risk.nodeId, to: root.nodeId, relation: 'CONTRADICTS' });
  const errors = validateTaskGraphStructure(corrupt);
  assert.ok(errors.includes('GRAPH_CYCLE_DETECTED'));
  assert.ok(errors.some((error) => error.startsWith('PARENT_CYCLE_DETECTED:')));
  const valid = graph(ctx);
  assert.throws(() => addTaskGraphEdge(valid, { from: risk.nodeId, to: 'missing-semantic-node', relation: 'SUPPLIES' }), /TASK_GRAPH_EDGE_ENDPOINT_INVALID/);
});

test('F-406-05 interaction: structural over-depth restore remains invalid even with valid semantic edges', () => {
  const ctx = contextWithGraph();
  const restored = cloneGraph(ctx);
  const risk = restored.nodes.find((node) => node.capabilityId === 'risk_agent')!;
  const opportunity = restored.nodes.find((node) => node.capabilityId === 'opportunity_agent')!;
  restored.edges.push({ from: risk.nodeId, to: opportunity.nodeId, relation: 'CONTRADICTS' });
  const level2 = appendChild(restored, risk, 'level-2', 2);
  restored.edges.push({ from: risk.nodeId, to: level2.nodeId, relation: 'REQUIRES' });
  const level3 = appendChild(restored, level2, 'level-3', 3);
  restored.edges.push({ from: level2.nodeId, to: level3.nodeId, relation: 'REQUIRES' });
  const errors = validateTaskGraphStructure(restored);
  assert.ok(errors.some((error) => error.startsWith('MAX_DEPTH_EXCEEDED:level-3:3:2')));
});

test('F-406-07: an already-stopped graph performs zero capability negotiation or budget mutation', async () => {
  const ctx = withRequests(contextWithGraph(), [request('stopped-entry')]);
  const g = graph(ctx);
  const risk = nodes(ctx).risk;
  markAdaptiveStop(g, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  const mutationCount = g.mutations.length;
  const budget = { ...g.invocationBudget };
  let calls = 0;
  const result = await executeAdaptiveCapabilityRequestsForNode({ context: ctx, parentNodeId: risk.nodeId, parentCapabilityId: 'risk_agent', requestCapability: async () => { calls += 1; throw new Error('must not negotiate after STOP'); } });
  assert.equal(calls, 0);
  assert.equal(result.graph.mutations.length, mutationCount);
  assert.deepEqual(result.graph.invocationBudget, budget);
  assert.equal(result.graph.stop.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
});

test('F-406-07: first request causing STOP leaves every later request untouched', async () => {
  const ctx = withRequests(contextWithGraph(), [request('first'), request('second')]);
  const risk = nodes(ctx).risk;
  let calls = 0;
  const result = await executeAdaptiveCapabilityRequestsForNode({
    context: ctx,
    parentNodeId: risk.nodeId,
    parentCapabilityId: 'risk_agent',
    requestCapability: async (input) => {
      calls += 1;
      markAdaptiveStop(graph(input.context), 'TEST_FIRST_REQUEST_STOP');
      return { request: input.request, decision: { contract: 'SFI-CAPABILITY-REQUEST-1.0', disposition: 'DENY', requestHash: capabilityRequestHash(input.request), executionAllowed: false, authorizationAllowed: false, deduplicated: false, reasons: ['test_stop'], authorityBoundary: 'TEST' }, context: input.context, executed: false, authorizationAllowed: false, requestEventId: null, dispositionEventId: null, grant: null, nonceHash: null, executionReceipt: null } as never;
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.graph.stop.reason, 'TEST_FIRST_REQUEST_STOP');
  assert.equal(result.graph.nodes.some((node) => node.requestId === 'second'), false);
});

test('F-406-07: invocation reservation and STOP are monotonic after stop', () => {
  const ctx = contextWithGraph();
  const g = graph(ctx);
  const used = g.invocationBudget.used;
  markAdaptiveStop(g, 'FIRST_TERMINAL_REASON');
  const mutations = g.mutations.length;
  assert.equal(reserveTaskGraphInvocation(g, nodes(ctx).risk.nodeId), false);
  assert.equal(g.invocationBudget.used, used);
  assert.equal(g.mutations.length, mutations);
  markAdaptiveStop(g, 'SECOND_REASON_MUST_NOT_REPLACE');
  assert.equal(g.stop.reason, 'FIRST_TERMINAL_REASON');
  assert.equal(g.mutations.length, mutations);
});

test('F-406-07 interaction: token STOP with unresolved capability blocks negotiation', async () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100 });
  const g = graph(ctx);
  const risk = nodes(ctx).risk;
  risk.state = 'WAITING_EVIDENCE';
  withRequests(ctx, [request('token-unresolved')]);
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', startMs(ctx) + 1).allowed, true);
  attachCurrentTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: null, observedProviderCostCurrency: null });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(unresolvedRequiredCapabilityCount(g), 1);
  let calls = 0;
  await executeAdaptiveCapabilityRequestsForNode({ context: ctx, parentNodeId: risk.nodeId, parentCapabilityId: 'risk_agent', requestCapability: async () => { calls += 1; throw new Error('no post-stop negotiation'); } });
  assert.equal(calls, 0);
});

test('F-406-07 interaction: cost STOP plus duplicate request remains terminal', async () => {
  const ctx = contextWithGraph({ maxObservedProviderCost: { amount: 1, currency: 'USD' } });
  const g = graph(ctx);
  const risk = nodes(ctx).risk;
  const duplicate = request('cost-duplicate');
  risk.state = 'WAITING_EVIDENCE';
  risk.requestHash = capabilityRequestHash(duplicate);
  withRequests(ctx, [duplicate]);
  assert.equal(pendingEquivalentRequestHash(g, duplicate), risk.requestHash);
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', startMs(ctx) + 1).allowed, true);
  attachCurrentTelemetry(ctx, { observedInputTokens: 1, observedOutputTokens: 1, observedProviderCost: 0.1, observedProviderCostCurrency: 'EUR' });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
  const mutations = g.mutations.length;
  let calls = 0;
  await executeAdaptiveCapabilityRequestsForNode({ context: ctx, parentNodeId: risk.nodeId, parentCapabilityId: 'risk_agent', requestCapability: async () => { calls += 1; throw new Error('no post-stop duplicate processing'); } });
  assert.equal(calls, 0);
  assert.equal(g.mutations.length, mutations);
});

test('F-406-07: deadline and max-model-call STOP both block capability negotiation', async () => {
  for (const kind of ['deadline', 'model'] as const) {
    const ctx = withRequests(contextWithGraph({ maxModelCalls: 1 }), [request(`${kind}-request`)]);
    const g = graph(ctx);
    const risk = nodes(ctx).risk;
    if (kind === 'deadline') {
      const deadline = Date.parse(g.runtimeControls.bounds.deadlineAt);
      assert.equal(runtimeExecutionPreflight(ctx, 'risk_agent', deadline).reason, 'EXECUTION_DEADLINE_REACHED');
    } else {
      const now = startMs(ctx) + 1;
      assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
      assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).reason, 'MAX_MODEL_CALLS_REACHED');
    }
    let calls = 0;
    await executeAdaptiveCapabilityRequestsForNode({ context: ctx, parentNodeId: risk.nodeId, parentCapabilityId: 'risk_agent', requestCapability: async () => { calls += 1; throw new Error('terminal stop'); } });
    assert.equal(calls, 0);
  }
});

test('F-406-06/07 interaction: a late model result is discarded, proposal is not emitted, and pending capability is untouched', async () => {
  const ctx = withRequests(contextWithGraph({ deadlineMs: 100 }), [request('late-model-pending')]);
  ctx.metadata.llmAugmentation = true;
  const g = graph(ctx);
  const risk = nodes(ctx).risk;
  let now = startMs(ctx) + 1;
  const deadline = Date.parse(g.runtimeControls.bounds.deadlineAt);
  let proposals = 0;
  const result = await runCognitiveAgent('risk_agent', ctx, {
    nowMs: () => now,
    executeAgent: (_agentId: string, current: KernelContext) => current,
    augmentAgentWithLlm: async (_agentId: string, current: KernelContext) => {
      now = deadline + 1;
      current.metadata = { ...current.metadata, agentInsights: { risk_agent: { status: 'COMPLETE', provider: 'late', model: 'late', summary: 'must be discarded' } }, llmRuntime: { observedInputTokens: 7, observedOutputTokens: 3, observedProviderCost: 0.2, observedProviderCostCurrency: 'USD' } };
      return current;
    },
    emitGovernedProposals: async (_agentId: string, current: KernelContext) => { proposals += 1; return current; },
    recordExecutionEvent: async () => undefined,
  } as never);
  assert.equal(g.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(g.stop.stopped, true);
  assert.equal(g.stop.reason, 'EXECUTION_DEADLINE_REACHED');
  assert.equal(proposals, 0);
  assert.equal((result.context.metadata.agentInsights as Record<string, unknown> | undefined)?.risk_agent, undefined);
  assert.equal(g.runtimeControls.usage.tokens.used, null);
  assert.equal(g.runtimeControls.usage.providerCost.used, null);
  let capabilityCalls = 0;
  const after = await executeAdaptiveCapabilityRequestsForNode({ context: result.context, parentNodeId: risk.nodeId, parentCapabilityId: 'risk_agent', requestCapability: async () => { capabilityCalls += 1; throw new Error('late result must not negotiate'); } });
  assert.equal(capabilityCalls, 0);
  assert.equal(after.graph.stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-06 control: valid model completion before deadline can emit proposal', async () => {
  const ctx = contextWithGraph({ deadlineMs: 100 });
  ctx.metadata.llmAugmentation = true;
  const g = graph(ctx);
  let now = startMs(ctx) + 1;
  let proposals = 0;
  const result = await runCognitiveAgent('risk_agent', ctx, {
    nowMs: () => now,
    executeAgent: (_agentId: string, current: KernelContext) => current,
    augmentAgentWithLlm: async (_agentId: string, current: KernelContext) => {
      now += 10;
      attachCurrentTelemetry(current, { observedInputTokens: 7, observedOutputTokens: 3, observedProviderCost: 0.2, observedProviderCostCurrency: 'USD' });
      current.metadata = { ...current.metadata, agentInsights: { risk_agent: { status: 'COMPLETE', provider: 'fake', model: 'fake', summary: 'on time' } } };
      return current;
    },
    emitGovernedProposals: async (_agentId: string, current: KernelContext) => { proposals += 1; return current; },
    recordExecutionEvent: async () => undefined,
  } as never);
  assert.equal(g.stop.stopped, false);
  assert.equal(g.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(g.runtimeControls.usage.tokens.used, 10);
  assert.equal(proposals, 1);
  assert.ok((result.context.metadata.agentInsights as Record<string, unknown>).risk_agent);
});

test('F-406-02 regression interaction: malformed graph blocks model execution before reservation', async () => {
  const ctx = contextWithGraph();
  ctx.metadata.llmAugmentation = true;
  const g = graph(ctx);
  const risk = nodes(ctx).risk;
  risk.depth = 0;
  let executeCalls = 0;
  await runCognitiveAgent('risk_agent', ctx, {
    nowMs: () => startMs(ctx) + 1,
    executeAgent: (_agentId: string, current: KernelContext) => { executeCalls += 1; return current; },
    recordExecutionEvent: async () => undefined,
  } as never);
  assert.equal(executeCalls, 0);
  assert.equal(g.stop.reason, 'RESTORED_RUNTIME_STATE_INVALID');
  assert.equal(g.runtimeControls.usage.modelCalls.used, 0);
});

test('F-406-05/07 interaction: semantic sibling edge remains valid before STOP and writer refuses mutation afterward', () => {
  const ctx = contextWithGraph();
  const g = graph(ctx);
  const { risk, opportunity } = nodes(ctx);
  addTaskGraphEdge(g, { from: risk.nodeId, to: opportunity.nodeId, relation: 'CALIBRATES' });
  assert.deepEqual(validateTaskGraphStructure(g), []);
  markAdaptiveStop(g, 'TERMINAL_AFTER_VALID_SEMANTIC_GRAPH');
  const mutations = g.mutations.length;
  assert.throws(() => addTaskGraphEdge(g, { from: risk.nodeId, to: opportunity.nodeId, relation: 'FALSIFIES' }), /TASK_GRAPH_STOPPED/);
  assert.equal(g.mutations.length, mutations);
  assert.equal(g.stop.reason, 'TERMINAL_AFTER_VALID_SEMANTIC_GRAPH');
});

test('F-406-07 checkpoint continuity: restored STOP remains terminal and cannot be cleared', () => {
  const ctx = contextWithGraph();
  markAdaptiveStop(graph(ctx), 'PERSISTED_TERMINAL_STOP');
  const restoredGraph = cloneGraph(ctx);
  const restoredContext: KernelContext = { ...ctx, metadata: { ...ctx.metadata, taskGraph: restoredGraph } };
  const readBack = taskGraphFromContext(restoredContext);
  assert.ok(readBack?.stop.stopped);
  markAdaptiveStop(readBack!, 'ATTEMPTED_REOPEN_REASON');
  assert.equal(readBack?.stop.reason, 'PERSISTED_TERMINAL_STOP');
});