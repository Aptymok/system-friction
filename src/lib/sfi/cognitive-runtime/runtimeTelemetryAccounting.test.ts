import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  executeAdaptiveCapabilityRequestsForNode,
  taskGraphFromContext,
} from './adaptiveTaskGraphRuntime';
import type { CognitiveTaskPlan } from './agents/metaOrchestrator';
import {
  checkpointContextProjection,
  mergeCheckpointContext,
} from './cognitiveCycle';
import type { KernelContext } from './kernelContext';
import { runCognitiveAgent } from './runtimeAgentExecutor';
import {
  observeRuntimeModelTelemetry,
  reserveRuntimeModelCall,
} from './runtimeStopControls';
import { buildTaskGraph } from './taskGraphBuilder';

function plan(): CognitiveTaskPlan {
  return {
    taskId: 'runtime-telemetry-accounting',
    requiredAgents: ['risk_agent'],
    executionOrder: ['meta_orchestrator', 'risk_agent'],
    missingInputs: [],
    readiness: 1,
    selectionMode: 'auto',
    selectionReasons: { risk_agent: ['f406-08-test'] },
  };
}

function contextWithGraph(limits: Parameters<typeof buildTaskGraph>[1] = {}): KernelContext {
  const taskGraph = buildTaskGraph(plan(), limits);
  return {
    cycleId: 'runtime-telemetry-accounting-cycle',
    logbookId: 'runtime-telemetry-accounting-logbook',
    taskId: 'runtime-telemetry-accounting',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [],
    hypotheses: [],
    contradictions: [],
    simulations: [],
    predictions: [],
    risks: [],
    opportunities: [],
    metadata: { taskGraph },
  };
}

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function graph(context: KernelContext) {
  return context.metadata.taskGraph as ReturnType<typeof buildTaskGraph>;
}

function startMs(context: KernelContext) {
  return Date.parse(graph(context).runtimeControls.bounds.startedAt);
}

function deadlineMs(context: KernelContext) {
  return Date.parse(graph(context).runtimeControls.bounds.deadlineAt);
}

function currentCallId(context: KernelContext) {
  const id = row(context.metadata?.llmRuntime).runtimeModelCallId;
  assert.equal(typeof id, 'string');
  return id as string;
}

function attachCurrentTelemetry(context: KernelContext, values: Record<string, unknown>) {
  const prior = row(context.metadata?.llmRuntime);
  const callId = currentCallId(context);
  context.metadata = {
    ...context.metadata,
    llmRuntime: {
      ...prior,
      observedProvider: 'openai',
      observedModel: 'test-model',
      observedInputTokens: null,
      observedOutputTokens: null,
      observedProviderCost: null,
      observedProviderCostCurrency: null,
      observedLatencyMs: 9,
      ...values,
      telemetryRuntimeModelCallId: callId,
      telemetryBoundary: 'PROVIDER_OR_RUNTIME_OBSERVATION_ONLY_NO_ESTIMATION',
    },
  };
  return context;
}

async function runLateExecutor(input: {
  limits?: Parameters<typeof buildTaskGraph>[1];
  telemetry?: Record<string, unknown> | null;
  throwInstead?: boolean;
}) {
  const context = contextWithGraph(input.limits ?? { deadlineMs: 100 });
  context.metadata = { ...context.metadata, llmAugmentation: true };
  const deadline = deadlineMs(context);
  let now = startMs(context) + 1;
  let proposals = 0;
  const result = await runCognitiveAgent('risk_agent', context, {
    nowMs: () => now,
    executeAgent: (_agentId: string, current: KernelContext) => current,
    augmentAgentWithLlm: async (_agentId: string, current: KernelContext) => {
      now = deadline + 1;
      if (input.telemetry) attachCurrentTelemetry(current, input.telemetry);
      if (input.throwInstead) throw new Error('PROVIDER_TIMEOUT');
      current.metadata = {
        ...current.metadata,
        agentInsights: {
          ...row(current.metadata?.agentInsights),
          risk_agent: { status: 'COMPLETE', summary: 'late semantic output must be discarded' },
        },
      };
      return current;
    },
    emitGovernedProposals: async (_agentId: string, current: KernelContext) => {
      proposals += 1;
      return current;
    },
    recordExecutionEvent: async () => undefined,
  });
  return { context: result.context, proposals };
}

function request(id: string) {
  return {
    requestId: id,
    trajectoryId: 'runtime-telemetry-accounting-cycle',
    parentStepId: null,
    requestedByCapabilityId: 'risk_agent',
    requestedCapabilityId: 'evidence_hunter',
    reason: 'F-406-08 must not reactivate capability negotiation.',
    requiredInputs: [],
    availableEvidenceRefs: [],
    requestedOutputs: ['EVIDENCE'],
    urgency: 'NORMAL' as const,
    requestedAt: '2026-09-07T05:00:00.000Z',
  };
}

test('F-406-08: late response with observed tokens is accounted once while semantic output remains rejected', async () => {
  const { context } = await runLateExecutor({ telemetry: { observedInputTokens: 7, observedOutputTokens: 3 } });
  const g = graph(context);
  assert.equal(g.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(g.runtimeControls.usage.tokens.used, 10);
  assert.equal(g.runtimeControls.usage.tokens.unobservedCalls, 0);
  assert.equal(row(context.metadata.llmRuntime).runtimeModelCallUsageDisposition, 'USAGE_OBSERVED');
  assert.equal(g.stop.stopped, true);
  assert.equal(g.stop.reason, 'EXECUTION_DEADLINE_REACHED');
  assert.equal(row(context.metadata.agentInsights).risk_agent, undefined);
});

test('F-406-08: late response with observed provider cost is accounted once with observed currency', async () => {
  const { context } = await runLateExecutor({ telemetry: { observedProviderCost: 0.4, observedProviderCostCurrency: 'USD' } });
  const usage = graph(context).runtimeControls.usage.providerCost;
  assert.equal(usage.used, 0.4);
  assert.equal(usage.currency, 'USD');
  assert.equal(usage.unobservedCalls, 0);
  assert.equal(row(context.metadata.llmRuntime).runtimeModelCallUsageDisposition, 'USAGE_OBSERVED');
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: late response with tokens and cost preserves both observations without semantic acceptance', async () => {
  const { context } = await runLateExecutor({
    telemetry: {
      observedInputTokens: 11,
      observedOutputTokens: 5,
      observedProviderCost: 0.75,
      observedProviderCostCurrency: 'USD',
    },
  });
  const controls = graph(context).runtimeControls;
  assert.equal(controls.usage.tokens.used, 16);
  assert.equal(controls.usage.providerCost.used, 0.75);
  assert.equal(controls.usage.tokens.unobservedCalls, 0);
  assert.equal(controls.usage.providerCost.unobservedCalls, 0);
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
  assert.equal(row(context.metadata.agentInsights).risk_agent, undefined);
});

test('F-406-08: deadline abort with no usage consumes model call and records NOT_OBSERVED exactly once', async () => {
  const { context } = await runLateExecutor({ telemetry: null, throwInstead: true });
  const controls = graph(context).runtimeControls;
  assert.equal(controls.usage.modelCalls.used, 1);
  assert.equal(controls.usage.tokens.used, null);
  assert.equal(controls.usage.providerCost.used, null);
  assert.equal(controls.usage.tokens.unobservedCalls, 1);
  assert.equal(controls.usage.providerCost.unobservedCalls, 1);
  assert.equal(row(context.metadata.llmRuntime).runtimeModelCallUsageDisposition, 'USAGE_NOT_OBSERVED');
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: provider timeout with no usage is operationally NOT_OBSERVED rather than zero usage', async () => {
  const { context } = await runLateExecutor({ telemetry: null, throwInstead: true });
  const controls = graph(context).runtimeControls;
  assert.equal(controls.usage.modelCalls.used, 1);
  assert.equal(controls.usage.tokens.observation, 'NOT_OBSERVED');
  assert.equal(controls.usage.providerCost.observation, 'NOT_OBSERVED');
  assert.equal(controls.usage.tokens.used, null);
  assert.equal(controls.usage.providerCost.used, null);
  assert.notEqual(controls.usage.tokens.used, 0);
  assert.notEqual(controls.usage.providerCost.used, 0);
});

test('F-406-03/08: previous observed telemetry is never reused by a later no-usage call', () => {
  const context = contextWithGraph();
  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', startMs(context) + 1).allowed, true);
  attachCurrentTelemetry(context, {
    observedInputTokens: 10,
    observedOutputTokens: 2,
    observedProviderCost: 0.2,
    observedProviderCostCurrency: 'USD',
  });
  observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(graph(context).runtimeControls.usage.tokens.used, 12);
  assert.equal(graph(context).runtimeControls.usage.providerCost.used, 0.2);
  const firstCallId = currentCallId(context);

  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', startMs(context) + 2).allowed, true);
  assert.notEqual(currentCallId(context), firstCallId);
  observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, null);
  assert.equal(graph(context).runtimeControls.usage.providerCost.used, null);
  assert.equal(graph(context).runtimeControls.usage.tokens.unobservedCalls, 1);
  assert.equal(graph(context).runtimeControls.usage.providerCost.unobservedCalls, 1);
  assert.equal(row(context.metadata.llmRuntime).runtimeModelCallUsageDisposition, 'USAGE_NOT_OBSERVED');
});

test('F-406-08: late current telemetry B accumulates with prior observed telemetry A exactly once', () => {
  const context = contextWithGraph();
  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', startMs(context) + 1).allowed, true);
  attachCurrentTelemetry(context, {
    observedInputTokens: 4,
    observedOutputTokens: 1,
    observedProviderCost: 0.1,
    observedProviderCostCurrency: 'USD',
  });
  observeRuntimeModelTelemetry(context, 'risk_agent');

  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', startMs(context) + 2).allowed, true);
  attachCurrentTelemetry(context, {
    observedInputTokens: 7,
    observedOutputTokens: 3,
    observedProviderCost: 0.25,
    observedProviderCostCurrency: 'USD',
  });
  observeRuntimeModelTelemetry(context, 'risk_agent');
  const controls = graph(context).runtimeControls;
  assert.equal(controls.usage.modelCalls.used, 2);
  assert.equal(controls.usage.tokens.used, 15);
  assert.equal(controls.usage.providerCost.used, 0.35);
});

test('F-406-08: configured token limit accounts late real usage but deadline remains governing STOP', async () => {
  const { context } = await runLateExecutor({
    limits: { deadlineMs: 100, maxObservedTokens: 5 },
    telemetry: { observedInputTokens: 4, observedOutputTokens: 4 },
  });
  const g = graph(context);
  assert.equal(g.runtimeControls.usage.tokens.used, 8);
  assert.equal(g.runtimeControls.usage.tokens.remaining, 0);
  assert.equal(g.stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: configured cost limit accounts late real cost but deadline remains governing STOP', async () => {
  const { context } = await runLateExecutor({
    limits: { deadlineMs: 100, maxObservedProviderCost: { amount: 0.25, currency: 'USD' } },
    telemetry: { observedProviderCost: 0.4, observedProviderCostCurrency: 'USD' },
  });
  const g = graph(context);
  assert.equal(g.runtimeControls.usage.providerCost.used, 0.4);
  assert.equal(g.runtimeControls.usage.providerCost.remaining, 0);
  assert.equal(g.stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: configured limits plus no telemetry remain fail-closed without zero fabrication and preserve deadline precedence', async () => {
  const { context } = await runLateExecutor({
    limits: {
      deadlineMs: 100,
      maxObservedTokens: 20,
      maxObservedProviderCost: { amount: 1, currency: 'USD' },
    },
    telemetry: null,
    throwInstead: true,
  });
  const controls = graph(context).runtimeControls;
  assert.equal(controls.usage.tokens.used, null);
  assert.equal(controls.usage.providerCost.used, null);
  assert.equal(controls.usage.tokens.unobservedCalls, 1);
  assert.equal(controls.usage.providerCost.unobservedCalls, 1);
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-07/08: late response cannot trigger capability negotiation after terminal deadline STOP', async () => {
  const { context } = await runLateExecutor({
    telemetry: {
      observedInputTokens: 2,
      observedOutputTokens: 1,
      observedProviderCost: 0.05,
      observedProviderCostCurrency: 'USD',
    },
  });
  context.metadata = { ...context.metadata, capabilityRequests: [request('late-capability')] };
  const risk = graph(context).nodes.find((node) => node.capabilityId === 'risk_agent');
  assert.ok(risk);
  let negotiations = 0;
  await executeAdaptiveCapabilityRequestsForNode({
    context,
    parentNodeId: risk.nodeId,
    parentCapabilityId: 'risk_agent',
    requestCapability: async () => {
      negotiations += 1;
      throw new Error('STOP must block capability negotiation');
    },
  });
  assert.equal(negotiations, 0);
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-06/08: late response cannot emit a governed proposal', async () => {
  const { context, proposals } = await runLateExecutor({
    telemetry: { observedInputTokens: 3, observedOutputTokens: 1 },
  });
  assert.equal(proposals, 0);
  assert.equal(row(context.metadata.agentInsights).risk_agent, undefined);
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: terminal accounting survives checkpoint/reentry exactly once', async () => {
  const { context } = await runLateExecutor({
    telemetry: {
      observedInputTokens: 5,
      observedOutputTokens: 2,
      observedProviderCost: 0.3,
      observedProviderCostCurrency: 'USD',
    },
  });
  const beforeTokens = graph(context).runtimeControls.usage.tokens.used;
  const beforeCost = graph(context).runtimeControls.usage.providerCost.used;
  const stored = JSON.parse(JSON.stringify(checkpointContextProjection(context))) as KernelContext;
  const restoredBase = contextWithGraph();
  const restored = mergeCheckpointContext(restoredBase, stored);
  const restoredGraph = taskGraphFromContext(restored);
  assert.ok(restoredGraph?.stop.stopped);
  assert.equal(restoredGraph?.runtimeControls.usage.tokens.used, beforeTokens);
  assert.equal(restoredGraph?.runtimeControls.usage.providerCost.used, beforeCost);
  assert.equal(restoredGraph?.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(restoredGraph?.stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-08: duplicate terminal processing cannot count current telemetry twice', () => {
  const context = contextWithGraph();
  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', startMs(context) + 1).allowed, true);
  attachCurrentTelemetry(context, {
    observedInputTokens: 6,
    observedOutputTokens: 2,
    observedProviderCost: 0.2,
    observedProviderCostCurrency: 'USD',
  });
  const first = observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(first.duplicate, undefined);
  const beforeTokens = graph(context).runtimeControls.usage.tokens.used;
  const beforeCost = graph(context).runtimeControls.usage.providerCost.used;
  const duplicate = observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(duplicate.duplicate, true);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, beforeTokens);
  assert.equal(graph(context).runtimeControls.usage.providerCost.used, beforeCost);
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
});

test('F-406-08 transport contract: agent client consumes telemetry plane independently of semantic result and broker suppresses late content', () => {
  const agentClient = readFileSync('src/infrastructure/ai/agentLlmClient.ts', 'utf8');
  const providerRouter = readFileSync('src/lib/ai/providerRouter.ts', 'utf8');
  assert.match(agentClient, /ok:\s*result\.telemetry\.provider\s*!==\s*null/);
  assert.match(agentClient, /usage:\s*result\.telemetry\.usage/);
  assert.match(agentClient, /latencyMs:\s*result\.telemetry\.latency_ms/);
  assert.match(agentClient, /semanticModelOutputAccepted:\s*result\.ok/);
  assert.match(agentClient, /trajectory_deadline_reached/);
  assert.match(providerRouter, /source:\s*'PROVIDER_RESPONSE'/);
  assert.match(providerRouter, /warnings\.push\('trajectory_deadline_reached'\)/);
  assert.match(providerRouter, /result:\s*''/);
  assert.match(providerRouter, /telemetry:\s*terminalTelemetry/);
});