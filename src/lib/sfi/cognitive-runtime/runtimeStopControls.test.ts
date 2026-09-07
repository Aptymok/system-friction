import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateAdaptiveStopInvariant,
  pendingEquivalentRequestHash,
  reserveTaskGraphInvocation,
  taskGraphFromContext,
  unresolvedRequiredCapabilityCount,
  validateTaskGraphStructure,
} from './adaptiveTaskGraphRuntime';
import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import { capabilityRequestHash, type SfiCapabilityRequest } from './capabilityBroker';
import type { KernelContext } from './kernelContext';
import {
  SFI_RUNTIME_STOP_COST_CONTROLS_CONTRACT,
  SFI_RUNTIME_STOP_COST_CONTROLS_GATE,
  observeRuntimeModelTelemetry,
  reserveRuntimeModelCall,
  runtimeBoundOverridesFromContext,
  runtimeExecutionPreflight,
  validateRuntimeStopCostControls,
} from './runtimeStopControls';
import { buildTaskGraph } from './taskGraphBuilder';
import {
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  SFI_ADAPTIVE_MAX_MODEL_CALLS,
  SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH,
  type SfiTaskGraph,
  type SfiTaskGraphNode,
} from './types';

function plan(): CognitiveTaskPlan {
  return {
    taskId: 'runtime-stop-cost-test',
    requiredAgents: ['risk_agent'],
    executionOrder: ['meta_orchestrator', 'risk_agent'],
    missingInputs: [],
    readiness: 1,
    selectionMode: 'auto',
    selectionReasons: { risk_agent: ['test'] },
  };
}

function contextWithGraph(limits: Parameters<typeof buildTaskGraph>[1] = {}): KernelContext {
  const graph = buildTaskGraph(plan(), limits);
  return {
    cycleId: 'runtime-stop-cost-cycle',
    logbookId: 'runtime-stop-cost-logbook',
    taskId: 'runtime-stop-cost-test',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [], hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [],
    metadata: { taskGraph: graph },
  };
}

function graph(context: KernelContext) {
  return context.metadata.taskGraph as ReturnType<typeof buildTaskGraph>;
}

function setTelemetry(context: KernelContext, values: Record<string, unknown>) {
  context.metadata = { ...context.metadata, llmRuntime: values };
}

function startMs(context: KernelContext) {
  return new Date(graph(context).runtimeControls.bounds.startedAt).getTime();
}

function restoredContext(restoredGraph: SfiTaskGraph): KernelContext {
  const context = contextWithGraph();
  context.metadata = { taskGraph: restoredGraph };
  return context;
}

function cloneGraph(context: KernelContext) {
  return JSON.parse(JSON.stringify(graph(context))) as SfiTaskGraph;
}

function appendStructuralChild(
  target: SfiTaskGraph,
  parent: SfiTaskGraphNode,
  nodeId: string,
  declaredDepth: number,
  capabilityId = 'risk_agent',
) {
  const template = target.nodes.find((node) => node.capabilityId === 'risk_agent') ?? target.nodes[0];
  const node: SfiTaskGraphNode = {
    ...template,
    id: nodeId,
    nodeId,
    agentId: capabilityId,
    capabilityId,
    state: 'PLANNED',
    prerequisites: [parent.nodeId],
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
    depth: declaredDepth,
  };
  target.nodes.push(node);
  target.edges.push({ from: parent.nodeId, to: node.nodeId, relation: 'REQUIRES' });
  return node;
}

function equivalentRequest(overrides: Partial<SfiCapabilityRequest> = {}): SfiCapabilityRequest {
  return {
    requestId: 'runtime-matrix-request',
    trajectoryId: 'runtime-stop-cost-cycle',
    parentStepId: null,
    requestedByCapabilityId: 'meta_orchestrator',
    requestedCapabilityId: 'risk_agent',
    reason: 'Bounded runtime assurance request.',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['RECOMMENDATION'],
    urgency: 'NORMAL',
    requestedAt: '2026-09-07T03:00:00.000Z',
    ...overrides,
  };
}

test('Slice F runtime controls are attached to the existing adaptive graph with non-expanding hard ceilings', () => {
  const ctx = contextWithGraph();
  const controls = graph(ctx).runtimeControls;
  assert.equal(SFI_RUNTIME_STOP_COST_CONTROLS_CONTRACT, 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0');
  assert.equal(SFI_RUNTIME_STOP_COST_CONTROLS_GATE, 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0');
  assert.equal(controls.bounds.maxDepth, SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH);
  assert.equal(controls.bounds.maxCapabilityInvocations, SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS);
  assert.equal(controls.bounds.maxModelCalls, SFI_ADAPTIVE_MAX_MODEL_CALLS);
  assert.equal(controls.observabilityBoundary, 'UNAVAILABLE_NOT_ZERO_NO_ESTIMATION');
  assert.deepEqual(validateRuntimeStopCostControls(graph(ctx), startMs(ctx) + 1), []);
});

test('runtime limit input may only tighten hard depth/invocation/model/deadline ceilings', () => {
  const ctx = contextWithGraph({ maxDepth: 1, maxCapabilityInvocations: 7, maxModelCalls: 3, deadlineMs: 30_000 });
  assert.equal(graph(ctx).runtimeControls.bounds.maxDepth, 1);
  assert.equal(graph(ctx).invocationBudget.max, 7);
  assert.equal(graph(ctx).runtimeControls.bounds.maxModelCalls, 3);
  assert.equal(graph(ctx).runtimeControls.bounds.maxDurationMs, 30_000);
  assert.throws(() => contextWithGraph({ maxDepth: SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH + 1 }), /RUNTIME_LIMIT_INVALID:maxDepth/);
  assert.throws(() => contextWithGraph({ maxCapabilityInvocations: SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS + 1 }), /RUNTIME_LIMIT_INVALID:maxCapabilityInvocations/);
  assert.throws(() => contextWithGraph({ maxModelCalls: SFI_ADAPTIVE_MAX_MODEL_CALLS + 1 }), /RUNTIME_LIMIT_INVALID:maxModelCalls/);
});

test('context limit parsing rejects malformed cost configuration instead of inventing a budget', () => {
  const valid = contextWithGraph();
  valid.metadata.cognitiveRuntimeLimits = {
    maxModelCalls: 4,
    maxObservedTokens: 9000,
    maxObservedProviderCost: { amount: 2.5, currency: 'usd' },
  };
  assert.deepEqual(runtimeBoundOverridesFromContext(valid), {
    maxDepth: undefined,
    maxCapabilityInvocations: undefined,
    maxModelCalls: 4,
    deadlineMs: undefined,
    maxObservedTokens: 9000,
    maxObservedProviderCost: { amount: 2.5, currency: 'usd' },
  });
  valid.metadata.cognitiveRuntimeLimits = { maxObservedProviderCost: { amount: 'unknown', currency: 'USD' } };
  assert.throws(() => runtimeBoundOverridesFromContext(valid), /RUNTIME_LIMIT_CONFIG_INVALID:amount/);
});

test('maximum operation-level model calls fail closed on the next call and remain observed runtime counts', () => {
  const ctx = contextWithGraph({ maxModelCalls: 2 });
  const now = startMs(ctx) + 1;
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.observation, 'OBSERVED');
  const blocked = reserveRuntimeModelCall(ctx, 'risk_agent', now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'MAX_MODEL_CALLS_REACHED');
  assert.equal(graph(ctx).stop.stopped, true);
});

test('execution deadline is absolute in the graph and cannot reset through another preflight', () => {
  const ctx = contextWithGraph({ deadlineMs: 20_000 });
  const deadline = new Date(graph(ctx).runtimeControls.bounds.deadlineAt).getTime();
  assert.equal(runtimeExecutionPreflight(ctx, 'risk_agent', deadline - 1).allowed, true);
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', deadline);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'EXECUTION_DEADLINE_REACHED');
  assert.equal(runtimeExecutionPreflight(ctx, 'risk_agent', deadline + 1000).allowed, false);
  assert.equal(graph(ctx).runtimeControls.bounds.deadlineAt, new Date(deadline).toISOString());
});

test('future restored clock interval fails closed before execution even when duration looks valid', () => {
  const ctx = contextWithGraph({ deadlineMs: 20_000 });
  const evaluationClock = Date.parse('2026-09-07T03:20:00.000Z');
  graph(ctx).runtimeControls.bounds.startedAt = new Date(evaluationClock + 1_000).toISOString();
  graph(ctx).runtimeControls.bounds.deadlineAt = new Date(evaluationClock + 21_000).toISOString();
  const validation = validateRuntimeStopCostControls(graph(ctx), evaluationClock);
  assert.ok(validation.includes('STARTED_AT_IN_FUTURE'));
  assert.ok(validation.includes('RESTORED_TIME_EXTENSION_INVALID'));
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', evaluationClock);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
  assert.equal(graph(ctx).stop.stopped, true);
});

test('malformed restored temporal envelope fails closed before execution', () => {
  const ctx = contextWithGraph();
  graph(ctx).runtimeControls.bounds.startedAt = 'not-a-timestamp';
  const evaluationClock = Date.parse('2026-09-07T03:20:00.000Z');
  assert.ok(validateRuntimeStopCostControls(graph(ctx), evaluationClock).includes('STARTED_AT_INVALID'));
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', evaluationClock);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
});

test('stricter runtime depth stops a structurally valid node beyond the configured trajectory depth', () => {
  const ctx = contextWithGraph({ maxDepth: 0 });
  const risk = graph(ctx).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', startMs(ctx) + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'MAX_TRAJECTORY_DEPTH_REACHED');
});

test('restored forged node depth lower than actual path fails closed before execution', () => {
  const ctx = contextWithGraph();
  const restored = cloneGraph(ctx);
  const risk = restored.nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  appendStructuralChild(restored, risk, 'forged-depth-grandchild', 1);
  const errors = validateTaskGraphStructure(restored);
  assert.ok(errors.some((error) => error.startsWith('DEPTH_MISMATCH:forged-depth-grandchild:1:2')));
  const restoredCtx = restoredContext(restored);
  const blocked = runtimeExecutionPreflight(restoredCtx, 'risk_agent', new Date(restored.runtimeControls.bounds.startedAt).getTime() + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
});

test('restored cyclic DAG fails closed before execution', () => {
  const ctx = contextWithGraph();
  const restored = cloneGraph(ctx);
  const root = restored.nodes.find((node) => node.capabilityId === 'meta_orchestrator');
  const risk = restored.nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(root && risk);
  restored.edges.push({ from: risk.nodeId, to: root.nodeId, relation: 'SUPPLIES' });
  assert.ok(validateTaskGraphStructure(restored).includes('GRAPH_CYCLE_DETECTED'));
  const blocked = runtimeExecutionPreflight(restoredContext(restored), 'risk_agent', new Date(restored.runtimeControls.bounds.startedAt).getTime() + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
});

test('restored dangling edge and incoherent ancestor relationship fail closed', () => {
  const ctx = contextWithGraph();
  const dangling = cloneGraph(ctx);
  const root = dangling.nodes.find((node) => node.capabilityId === 'meta_orchestrator');
  assert.ok(root);
  dangling.edges.push({ from: root.nodeId, to: 'missing-node', relation: 'REQUIRES' });
  assert.ok(validateTaskGraphStructure(dangling).includes('EDGE_TO_DANGLING:missing-node'));
  assert.equal(runtimeExecutionPreflight(restoredContext(dangling), 'risk_agent', new Date(dangling.runtimeControls.bounds.startedAt).getTime() + 1).allowed, false);

  const ancestors = cloneGraph(ctx);
  const risk = ancestors.nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  risk.ancestorNodeIds = [];
  assert.ok(validateTaskGraphStructure(ancestors).some((error) => error.startsWith(`ANCESTOR_CHAIN_MISMATCH:${risk.nodeId}`)));
  assert.equal(runtimeExecutionPreflight(restoredContext(ancestors), 'risk_agent', new Date(ancestors.runtimeControls.bounds.startedAt).getTime() + 1).allowed, false);
});

test('restored over-depth graph cannot hide behind falsified depth metadata', () => {
  const ctx = contextWithGraph();
  const restored = cloneGraph(ctx);
  const risk = restored.nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  const level2 = appendStructuralChild(restored, risk, 'level-2', 2);
  appendStructuralChild(restored, level2, 'level-3-forged', 1);
  const errors = validateTaskGraphStructure(restored);
  assert.ok(errors.some((error) => error.startsWith('DEPTH_MISMATCH:level-3-forged:1:3')));
  assert.ok(errors.some((error) => error.startsWith('MAX_DEPTH_EXCEEDED:level-3-forged:3:2')));
  const blocked = runtimeExecutionPreflight(restoredContext(restored), 'risk_agent', new Date(restored.runtimeControls.bounds.startedAt).getTime() + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
});

test('valid restored DAG continues with original clock and no budget reset', () => {
  const ctx = contextWithGraph({ maxModelCalls: 3, deadlineMs: 20_000 });
  const now = startMs(ctx) + 1;
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  const restored = cloneGraph(ctx);
  const restoredCtx = restoredContext(restored);
  assert.equal(taskGraphFromContext(restoredCtx), restored);
  const preflight = runtimeExecutionPreflight(restoredCtx, 'risk_agent', now + 1);
  assert.equal(preflight.allowed, true);
  assert.equal(restored.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(restored.runtimeControls.usage.modelCalls.remaining, 2);
  assert.equal(restored.runtimeControls.bounds.startedAt, graph(ctx).runtimeControls.bounds.startedAt);
  assert.equal(restored.runtimeControls.bounds.deadlineAt, graph(ctx).runtimeControls.bounds.deadlineAt);
});

test('observed token usage accumulates and stops at a configured token maximum', () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100 });
  const now = startMs(ctx) + 1;
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: 50, observedOutputTokens: 20, observedProviderCost: null, observedProviderCostCurrency: null });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').stopped, false);
  assert.deepEqual(graph(ctx).runtimeControls.usage.tokens, { used: 70, remaining: 30, observation: 'OBSERVED', unobservedCalls: 0 });
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: 20, observedOutputTokens: 10, observedProviderCost: null, observedProviderCostCurrency: null });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'MAX_OBSERVED_TOKENS_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, 100);
});

test('configured token bound fails closed when provider token usage is unavailable; unavailable is never zero', () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100 });
  reserveRuntimeModelCall(ctx, 'risk_agent', startMs(ctx) + 1);
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: null, observedProviderCostCurrency: null });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  const usage = graph(ctx).runtimeControls.usage.tokens;
  assert.equal(stopped.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(usage.observation, 'NOT_OBSERVED');
  assert.equal(usage.used, null);
  assert.equal(usage.remaining, null);
  assert.notEqual(usage.used, 0);
});

test('without configured token/cost bounds, missing current-call telemetry remains NOT_OBSERVED while model-call/deadline controls continue', () => {
  const ctx = contextWithGraph({ maxModelCalls: 2 });
  reserveRuntimeModelCall(ctx, 'risk_agent', startMs(ctx) + 1);
  const result = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(result.stopped, false);
  assert.equal(graph(ctx).runtimeControls.usage.tokens.observation, 'NOT_OBSERVED');
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.observation, 'NOT_OBSERVED');
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 1);
});

test('observed provider cost accumulates only in the configured observed currency and fails closed at the maximum', () => {
  const ctx = contextWithGraph({ maxObservedProviderCost: { amount: 1, currency: 'USD' } });
  const now = startMs(ctx) + 1;
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: 0.4, observedProviderCostCurrency: 'USD' });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').stopped, false);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, 0.4);
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: 0.6, observedProviderCostCurrency: 'USD' });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'MAX_OBSERVED_PROVIDER_COST_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, 1);
});

test('configured monetary bound fails closed on unavailable cost or currency mismatch instead of estimating', () => {
  const unavailable = contextWithGraph({ maxObservedProviderCost: { amount: 2, currency: 'USD' } });
  reserveRuntimeModelCall(unavailable, 'risk_agent', startMs(unavailable) + 1);
  setTelemetry(unavailable, { observedInputTokens: 10, observedOutputTokens: 10, observedProviderCost: null, observedProviderCostCurrency: null });
  assert.equal(observeRuntimeModelTelemetry(unavailable, 'risk_agent').reason, 'PROVIDER_COST_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(graph(unavailable).runtimeControls.usage.providerCost.used, null);

  const mismatch = contextWithGraph({ maxObservedProviderCost: { amount: 2, currency: 'USD' } });
  reserveRuntimeModelCall(mismatch, 'risk_agent', startMs(mismatch) + 1);
  setTelemetry(mismatch, { observedInputTokens: 10, observedOutputTokens: 10, observedProviderCost: 0.2, observedProviderCostCurrency: 'EUR' });
  assert.equal(observeRuntimeModelTelemetry(mismatch, 'risk_agent').reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
  assert.equal(graph(mismatch).runtimeControls.usage.providerCost.observation, 'NOT_OBSERVED');
  assert.equal(graph(mismatch).runtimeControls.usage.providerCost.currency, null);
});

test('prior observed telemetry is cleared before a subsequent failed/no-telemetry model call and is never double-counted', () => {
  const ctx = contextWithGraph({ maxModelCalls: 3 });
  const now = startMs(ctx) + 1;
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  setTelemetry(ctx, { observedInputTokens: 10, observedOutputTokens: 5, observedProviderCost: 0.2, observedProviderCostCurrency: 'USD' });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').stopped, false);
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, 15);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, 0.2);

  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  const currentCallTelemetry = ctx.metadata.llmRuntime as Record<string, unknown>;
  assert.equal(currentCallTelemetry.observedInputTokens, null);
  assert.equal(currentCallTelemetry.observedOutputTokens, null);
  assert.equal(currentCallTelemetry.observedProviderCost, null);
  assert.equal(currentCallTelemetry.observedProviderCostCurrency, null);
  const second = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(second.stopped, false);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 2);
  assert.deepEqual(graph(ctx).runtimeControls.usage.tokens, { used: null, remaining: null, observation: 'NOT_OBSERVED', unobservedCalls: 1 });
  assert.deepEqual(graph(ctx).runtimeControls.usage.providerCost, { used: null, remaining: null, currency: null, observation: 'NOT_OBSERVED', unobservedCalls: 1 });
});

test('failed second call under configured token limit fails closed without stale token or cost reuse', () => {
  const ctx = contextWithGraph({ maxModelCalls: 3, maxObservedTokens: 1_000 });
  const now = startMs(ctx) + 1;
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: 10, observedOutputTokens: 5, observedProviderCost: 0.2, observedProviderCostCurrency: 'USD' });
  observeRuntimeModelTelemetry(ctx, 'risk_agent');
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.currency, null);
});

test('failed second call under configured provider-cost limit fails closed without stale currency reuse', () => {
  const ctx = contextWithGraph({ maxModelCalls: 3, maxObservedProviderCost: { amount: 10, currency: 'USD' } });
  const now = startMs(ctx) + 1;
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  setTelemetry(ctx, { observedInputTokens: 10, observedOutputTokens: 5, observedProviderCost: 0.2, observedProviderCostCurrency: 'USD' });
  observeRuntimeModelTelemetry(ctx, 'risk_agent');
  reserveRuntimeModelCall(ctx, 'risk_agent', now);
  const beforeObserve = ctx.metadata.llmRuntime as Record<string, unknown>;
  assert.equal(beforeObserve.observedProviderCostCurrency, null);
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'PROVIDER_COST_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.currency, null);
});

test('interaction: simultaneous deadline and exhausted model-call budget is deterministic and deadline governs without refund', () => {
  const ctx = contextWithGraph({ maxModelCalls: 1, deadlineMs: 10_000 });
  const started = startMs(ctx);
  const deadline = new Date(graph(ctx).runtimeControls.bounds.deadlineAt).getTime();
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', started + 1).allowed, true);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 1);
  const blocked = reserveRuntimeModelCall(ctx, 'risk_agent', deadline);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'EXECUTION_DEADLINE_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 1);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.remaining, 0);
});

test('interaction: token unavailable plus exhausted capability invocations remains monotonic and capability stop is not overwritten', () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100, maxModelCalls: 3 });
  const now = startMs(ctx) + 1;
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent', now).allowed, true);
  graph(ctx).invocationBudget.used = graph(ctx).invocationBudget.max;
  graph(ctx).invocationBudget.remaining = 0;
  const risk = graph(ctx).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  assert.equal(reserveTaskGraphInvocation(graph(ctx), risk.nodeId), false);
  assert.equal(graph(ctx).stop.reason, 'MAX_CAPABILITY_INVOCATIONS_REACHED');
  const observed = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(observed.reason, 'MAX_CAPABILITY_INVOCATIONS_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.tokens.observation, 'NOT_OBSERVED');
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, null);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 1);
});

test('interaction: cost currency failure remains governing even when convergence predicate is otherwise true', () => {
  const ctx = contextWithGraph({ maxObservedProviderCost: { amount: 2, currency: 'USD' } });
  reserveRuntimeModelCall(ctx, 'risk_agent', startMs(ctx) + 1);
  setTelemetry(ctx, { observedInputTokens: 10, observedOutputTokens: 10, observedProviderCost: 0.2, observedProviderCostCurrency: 'EUR' });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
  const convergence = evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: 0 });
  assert.equal(convergence.stop, true);
  assert.equal(graph(ctx).stop.reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
  assert.equal(runtimeExecutionPreflight(ctx, 'risk_agent', startMs(ctx) + 2).allowed, false);
  assert.equal(graph(ctx).stop.reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
});

test('interaction: depth violation cannot be bypassed by an equivalent pending capability request', () => {
  const ctx = contextWithGraph({ maxDepth: 0 });
  const req = equivalentRequest();
  const hash = capabilityRequestHash(req);
  const risk = graph(ctx).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  risk.requestHash = hash;
  assert.equal(pendingEquivalentRequestHash(graph(ctx), req), hash);
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', startMs(ctx) + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'MAX_TRAJECTORY_DEPTH_REACHED');
  assert.equal(graph(ctx).stop.reason, 'MAX_TRAJECTORY_DEPTH_REACHED');
});

test('interaction: unresolved required capability prevents no-new-information/no-new-state convergence stop', () => {
  const ctx = contextWithGraph();
  const risk = graph(ctx).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  risk.state = 'WAITING_EVIDENCE';
  const unresolved = unresolvedRequiredCapabilityCount(graph(ctx));
  assert.equal(unresolved, 1);
  const convergence = evaluateAdaptiveStopInvariant({ informationChanged: false, stateChanged: false, unresolvedRequiredCapabilities: unresolved });
  assert.equal(convergence.stop, false);
  assert.equal(convergence.reason, null);
});

test('interaction: malformed restored counters fail closed on execution attempt instead of resetting consumption', () => {
  const ctx = contextWithGraph();
  graph(ctx).runtimeControls.usage.modelCalls = { used: 4, remaining: 22, observation: 'OBSERVED' };
  assert.ok(validateRuntimeStopCostControls(graph(ctx), startMs(ctx) + 1).includes('MODEL_CALL_USAGE_INVALID'));
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent', startMs(ctx) + 1);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'RESTORED_RUNTIME_STATE_INVALID');
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 4);
  assert.equal(graph(ctx).stop.stopped, true);
});
