import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTaskGraph } from './taskGraphBuilder';
import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
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
import {
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  SFI_ADAPTIVE_MAX_MODEL_CALLS,
  SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH,
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

test('Slice F runtime controls are attached to the existing adaptive graph with non-expanding hard ceilings', () => {
  const ctx = contextWithGraph();
  const controls = graph(ctx).runtimeControls;
  assert.equal(SFI_RUNTIME_STOP_COST_CONTROLS_CONTRACT, 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0');
  assert.equal(SFI_RUNTIME_STOP_COST_CONTROLS_GATE, 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0');
  assert.equal(controls.bounds.maxDepth, SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH);
  assert.equal(controls.bounds.maxCapabilityInvocations, SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS);
  assert.equal(controls.bounds.maxModelCalls, SFI_ADAPTIVE_MAX_MODEL_CALLS);
  assert.equal(controls.observabilityBoundary, 'UNAVAILABLE_NOT_ZERO_NO_ESTIMATION');
  assert.deepEqual(validateRuntimeStopCostControls(graph(ctx)), []);
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
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent').allowed, true);
  assert.equal(reserveRuntimeModelCall(ctx, 'risk_agent').allowed, true);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(ctx).runtimeControls.usage.modelCalls.observation, 'OBSERVED');
  const blocked = reserveRuntimeModelCall(ctx, 'risk_agent');
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
});

test('stricter runtime depth stops a node beyond the configured trajectory depth', () => {
  const ctx = contextWithGraph({ maxDepth: 0 });
  const risk = graph(ctx).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  const blocked = runtimeExecutionPreflight(ctx, 'risk_agent');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'MAX_TRAJECTORY_DEPTH_REACHED');
});

test('observed token usage accumulates and stops at a configured token maximum', () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100 });
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: 50, observedOutputTokens: 20, observedProviderCost: null, observedProviderCostCurrency: null });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').stopped, false);
  assert.deepEqual(graph(ctx).runtimeControls.usage.tokens, { used: 70, remaining: 30, observation: 'OBSERVED', unobservedCalls: 0 });
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: 20, observedOutputTokens: 10, observedProviderCost: null, observedProviderCostCurrency: null });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'MAX_OBSERVED_TOKENS_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.tokens.used, 100);
});

test('configured token bound fails closed when provider token usage is unavailable; unavailable is never zero', () => {
  const ctx = contextWithGraph({ maxObservedTokens: 100 });
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: null, observedProviderCostCurrency: null });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  const usage = graph(ctx).runtimeControls.usage.tokens;
  assert.equal(stopped.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(usage.observation, 'NOT_OBSERVED');
  assert.equal(usage.used, null);
  assert.equal(usage.remaining, null);
  assert.notEqual(usage.used, 0);
});

test('without a configured token/cost bound, missing provider telemetry remains NOT_OBSERVED but model-call/deadline controls continue', () => {
  const ctx = contextWithGraph({ maxModelCalls: 2 });
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: null, observedProviderCostCurrency: null });
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
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: 0.4, observedProviderCostCurrency: 'USD' });
  assert.equal(observeRuntimeModelTelemetry(ctx, 'risk_agent').stopped, false);
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, 0.4);
  reserveRuntimeModelCall(ctx, 'risk_agent');
  setTelemetry(ctx, { observedInputTokens: null, observedOutputTokens: null, observedProviderCost: 0.6, observedProviderCostCurrency: 'USD' });
  const stopped = observeRuntimeModelTelemetry(ctx, 'risk_agent');
  assert.equal(stopped.reason, 'MAX_OBSERVED_PROVIDER_COST_REACHED');
  assert.equal(graph(ctx).runtimeControls.usage.providerCost.used, 1);
});

test('configured monetary bound fails closed on unavailable cost or currency mismatch instead of estimating', () => {
  const unavailable = contextWithGraph({ maxObservedProviderCost: { amount: 2, currency: 'USD' } });
  reserveRuntimeModelCall(unavailable, 'risk_agent');
  setTelemetry(unavailable, { observedInputTokens: 10, observedOutputTokens: 10, observedProviderCost: null, observedProviderCostCurrency: null });
  assert.equal(observeRuntimeModelTelemetry(unavailable, 'risk_agent').reason, 'PROVIDER_COST_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
  assert.equal(graph(unavailable).runtimeControls.usage.providerCost.used, null);

  const mismatch = contextWithGraph({ maxObservedProviderCost: { amount: 2, currency: 'USD' } });
  reserveRuntimeModelCall(mismatch, 'risk_agent');
  setTelemetry(mismatch, { observedInputTokens: 10, observedOutputTokens: 10, observedProviderCost: 0.2, observedProviderCostCurrency: 'EUR' });
  assert.equal(observeRuntimeModelTelemetry(mismatch, 'risk_agent').reason, 'PROVIDER_COST_CURRENCY_MISMATCH');
});

test('corrupt restored runtime counters fail closed at validation instead of resetting trajectory consumption', () => {
  const ctx = contextWithGraph();
  graph(ctx).runtimeControls.usage.modelCalls = { used: 4, remaining: 22, observation: 'OBSERVED' };
  assert.ok(validateRuntimeStopCostControls(graph(ctx)).includes('MODEL_CALL_USAGE_INVALID'));
});
