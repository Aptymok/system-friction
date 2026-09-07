import test from 'node:test';
import assert from 'node:assert/strict';

import { runLlmTask, type LlmProviderId, type LlmRouterResult } from '@/lib/ai/providerRouter';
import {
  compactObservedGenAiTelemetry,
  normalizeObservedGenAiTelemetry,
} from './genAiTelemetry';
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
  runtimeExecutionPreflight,
} from './runtimeStopControls';
import { buildTaskGraph } from './taskGraphBuilder';

process.env.OPENAI_API_KEY = 'f09-openai';
process.env.ANTHROPIC_API_KEY = 'f09-anthropic';
process.env.GEMINI_API_KEY = 'f09-gemini';
process.env.GROQ_API_KEY = 'f09-groq';
process.env.HUGGINGFACE_API_KEY = 'f09-hf';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'huggingface';
type AttemptSpec = {
  provider: Provider;
  semantic: 'valid' | 'empty' | 'http_error' | 'throw';
  usage?: Record<string, unknown> | null;
  elapsedMs?: number;
  content?: string;
};

type ExecuteOptions = {
  offsetMs: number;
  preferredProvider?: LlmProviderId;
  allowlist: Provider[];
  maxProviderAttempts?: number;
};

function plan(): CognitiveTaskPlan {
  return {
    taskId: 'runtime-provider-fallback-accounting',
    requiredAgents: ['risk_agent'],
    executionOrder: ['meta_orchestrator', 'risk_agent'],
    missingInputs: [],
    readiness: 1,
    selectionMode: 'auto',
    selectionReasons: { risk_agent: ['f406-09-test'] },
  };
}

function contextWithGraph(limits: Parameters<typeof buildTaskGraph>[1] = {}): KernelContext {
  const taskGraph = buildTaskGraph(plan(), { deadlineMs: 300_000, ...limits });
  return {
    cycleId: 'runtime-provider-fallback-accounting-cycle',
    logbookId: 'runtime-provider-fallback-accounting-logbook',
    taskId: 'runtime-provider-fallback-accounting',
    currentEvent: 'SFI_TASK_CREATED',
    evidence: [], hypotheses: [], contradictions: [], simulations: [], predictions: [], risks: [], opportunities: [],
    metadata: { taskGraph },
  };
}

function row(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function graph(context: KernelContext) { return context.metadata.taskGraph as ReturnType<typeof buildTaskGraph>; }
function graphStart(context: KernelContext) { return Date.parse(graph(context).runtimeControls.bounds.startedAt); }
function graphDeadline(context: KernelContext) { return Date.parse(graph(context).runtimeControls.bounds.deadlineAt); }
function currentCallId(context: KernelContext) {
  const id = row(context.metadata?.llmRuntime).runtimeModelCallId;
  assert.equal(typeof id, 'string');
  return id as string;
}

function providerFromUrl(url: string): Provider {
  if (url.includes('api.openai.com')) return 'openai';
  if (url.includes('api.anthropic.com')) return 'anthropic';
  if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (url.includes('api.groq.com')) return 'groq';
  if (url.includes('router.huggingface.co')) return 'huggingface';
  throw new Error(`UNEXPECTED_PROVIDER_URL:${url}`);
}

function responseFor(spec: AttemptSpec) {
  if (spec.semantic === 'http_error') {
    return new Response(JSON.stringify({ error: { message: 'f09 simulated provider failure' } }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }
  const content = spec.semantic === 'valid' ? spec.content ?? '{"summary":"accepted"}' : '';
  if (spec.provider === 'anthropic') {
    return new Response(JSON.stringify({ content: content ? [{ type: 'text', text: content }] : [], usage: spec.usage ?? null }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
  if (spec.provider === 'gemini') {
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: content ? [{ text: content }] : [] } }],
      usageMetadata: spec.usage ?? null,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ choices: [{ message: { content } }], usage: spec.usage ?? null }), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
}

function applyResultTelemetry(context: KernelContext, result: LlmRouterResult) {
  const telemetry = normalizeObservedGenAiTelemetry({
    ok: result.telemetry.provider !== null,
    provider: result.telemetry.provider ?? 'degraded',
    model: result.telemetry.model ?? 'unavailable',
    usage: result.telemetry.usage,
    latencyMs: result.telemetry.latency_ms,
  });
  const prior = row(context.metadata?.llmRuntime);
  const callId = currentCallId(context);
  context.metadata = {
    ...context.metadata,
    llmRuntime: {
      ...prior,
      ...compactObservedGenAiTelemetry(telemetry),
      telemetryRuntimeModelCallId: callId,
      modelTelemetrySource: result.telemetry.source,
      semanticModelOutputAccepted: result.ok,
    },
  };
  return telemetry;
}

async function executeOperation(context: KernelContext, specs: AttemptSpec[], options: ExecuteOptions) {
  const originalNow = Date.now;
  const originalFetch = globalThis.fetch;
  let now = graphStart(context) + options.offsetMs;
  let fetchCalls = 0;
  Date.now = () => now;
  globalThis.fetch = (async (request: RequestInfo | URL) => {
    const spec = specs[fetchCalls++];
    assert.ok(spec, 'broker must not execute an unplanned provider attempt');
    assert.equal(providerFromUrl(String(request)), spec.provider);
    now += spec.elapsedMs ?? 1;
    if (spec.semantic === 'throw') throw new Error('PROVIDER_TIMEOUT');
    return responseFor(spec);
  }) as typeof fetch;
  try {
    const reservation = reserveRuntimeModelCall(context, 'risk_agent', now);
    assert.equal(reservation.allowed, true);
    const callId = currentCallId(context);
    const result = await runLlmTask({
      task: 'draft',
      prompt: 'F-406-09 cumulative provider attempt accounting',
      fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
      preferredProvider: options.preferredProvider ?? 'openai',
      requirements: { providerAllowlist: options.allowlist, reasoning: true },
      maxProviderAttempts: options.maxProviderAttempts ?? specs.length,
      deadlineAtMs: graphDeadline(context),
    });
    const telemetry = applyResultTelemetry(context, result);
    if (result.warnings.includes('trajectory_deadline_reached')) runtimeExecutionPreflight(context, 'risk_agent', now);
    const accounting = observeRuntimeModelTelemetry(context, 'risk_agent');
    return { context, result, telemetry, accounting, fetchCalls, callId, now };
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
}

function tokenUsage(provider: Provider, input: number, output: number, extra: Record<string, unknown> = {}) {
  if (provider === 'anthropic') return { input_tokens: input, output_tokens: output, ...extra };
  if (provider === 'gemini') return { promptTokenCount: input, candidatesTokenCount: output, ...extra };
  return { prompt_tokens: input, completion_tokens: output, ...extra };
}

function request(id: string) {
  return {
    requestId: id,
    trajectoryId: 'runtime-provider-fallback-accounting-cycle',
    parentStepId: null,
    requestedByCapabilityId: 'risk_agent',
    requestedCapabilityId: 'evidence_hunter',
    reason: 'F-406-09 cumulative STOP must block capability negotiation.',
    requiredInputs: [], availableEvidenceRefs: [], requestedOutputs: ['EVIDENCE'], urgency: 'NORMAL' as const,
    requestedAt: '2026-09-07T06:20:00.000Z',
  };
}

test('F-406-09 A/K: observed fallback usage aggregates 90+20 and cumulative-only bound breach STOPs', { concurrency: false }, async () => {
  const context = contextWithGraph({ maxObservedTokens: 100 });
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 60, 30) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 10, 10), content: '{"summary":"provider-b"}' },
  ], { offsetMs: 0, allowlist: ['openai', 'anthropic'] });
  assert.equal(execution.fetchCalls, 2);
  assert.equal(execution.result.ok, true);
  assert.match(execution.result.result, /provider-b/);
  assert.equal(execution.result.telemetry.attempts.length, 2);
  assert.deepEqual(execution.result.telemetry.attempts.map((attempt) => attempt.semanticDisposition), ['REJECTED_EMPTY', 'ACCEPTED']);
  assert.equal(execution.telemetry.inputTokens.value, 70);
  assert.equal(execution.telemetry.outputTokens.value, 40);
  assert.equal(execution.telemetry.operationTokenUsageCompleteness, 'COMPLETE');
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, 110);
  assert.equal(graph(context).runtimeControls.usage.tokens.remaining, 0);
  assert.equal(graph(context).stop.reason, 'MAX_OBSERVED_TOKENS_REACHED');
});

test('F-406-09 B: first unobserved attempt makes operation token total incomplete and configured bound fails closed', { concurrency: false }, async () => {
  const context = contextWithGraph({ maxObservedTokens: 100 });
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'http_error' },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 12, 8) },
  ], { offsetMs: 35_000, allowlist: ['openai', 'anthropic'] });
  assert.equal(execution.result.ok, true);
  assert.equal(execution.telemetry.providerAttempts.length, 2);
  assert.equal(execution.telemetry.providerAttempts[0].usageDisposition, 'USAGE_NOT_OBSERVED');
  assert.equal(execution.telemetry.providerAttempts[1].tokenUsageDisposition, 'USAGE_OBSERVED');
  assert.equal(execution.telemetry.operationTokenUsageCompleteness, 'INCOMPLETE_FOR_BOUND_EVALUATION');
  assert.equal(execution.telemetry.inputTokens.value, null);
  assert.equal(execution.telemetry.outputTokens.value, null);
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, null);
  assert.notEqual(graph(context).runtimeControls.usage.tokens.used, 20);
  assert.notEqual(graph(context).runtimeControls.usage.tokens.used, 0);
  assert.equal(graph(context).runtimeControls.usage.tokens.unobservedCalls, 1);
  assert.equal(graph(context).stop.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
});

test('F-406-09 C: same-currency observed provider costs aggregate exactly once', { concurrency: false }, async () => {
  const context = contextWithGraph();
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 1, 1, { cost: 0.04, currency: 'USD' }) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 1, 1, { cost: 0.03, currency: 'USD' }) },
  ], { offsetMs: 70_000, allowlist: ['openai', 'anthropic'] });
  assert.equal(execution.telemetry.operationProviderCostCompleteness, 'COMPLETE');
  assert.equal(execution.telemetry.providerCost.value, 0.07);
  assert.equal(execution.telemetry.providerCostCurrency.value, 'USD');
  assert.equal(graph(context).runtimeControls.usage.providerCost.used, 0.07);
  assert.equal(graph(context).runtimeControls.usage.providerCost.currency, 'USD');
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
});

test('F-406-09 D: incompatible observed currencies remain preserved per attempt but aggregate cost is not evaluable', { concurrency: false }, async () => {
  const context = contextWithGraph({ maxObservedProviderCost: { amount: 1, currency: 'USD' } });
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 1, 1, { cost: 0.04, currency: 'USD' }) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 1, 1, { cost: 0.03, currency: 'EUR' }) },
  ], { offsetMs: 105_000, allowlist: ['openai', 'anthropic'] });
  assert.equal(execution.telemetry.providerAttempts[0].providerCost.value, 0.04);
  assert.equal(execution.telemetry.providerAttempts[0].providerCostCurrency.value, 'USD');
  assert.equal(execution.telemetry.providerAttempts[1].providerCost.value, 0.03);
  assert.equal(execution.telemetry.providerAttempts[1].providerCostCurrency.value, 'EUR');
  assert.equal(execution.telemetry.operationProviderCostCompleteness, 'INCOMPLETE_FOR_BOUND_EVALUATION');
  assert.equal(execution.telemetry.providerCost.value, null);
  assert.equal(execution.telemetry.providerCostCurrency.value, null);
  assert.equal(graph(context).runtimeControls.usage.providerCost.used, null);
  assert.notEqual(graph(context).runtimeControls.usage.providerCost.used, 0.07);
  assert.equal(graph(context).runtimeControls.usage.providerCost.unobservedCalls, 1);
  assert.equal(graph(context).stop.reason, 'PROVIDER_COST_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
});

test('F-406-09 E: three internal provider attempts aggregate A+B+C while modelCalls remains one', { concurrency: false }, async () => {
  const context = contextWithGraph();
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 4, 6) },
    { provider: 'gemini', semantic: 'empty', usage: tokenUsage('gemini', 8, 12) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 10, 20) },
  ], { offsetMs: 140_000, allowlist: ['openai', 'gemini', 'anthropic'], maxProviderAttempts: 3 });
  assert.equal(execution.fetchCalls, 3);
  assert.equal(execution.result.telemetry.attempts.length, 3);
  assert.deepEqual(execution.result.telemetry.attempts.map((attempt) => attempt.semanticDisposition), ['REJECTED_EMPTY', 'REJECTED_EMPTY', 'ACCEPTED']);
  assert.equal(execution.telemetry.inputTokens.value, 22);
  assert.equal(execution.telemetry.outputTokens.value, 38);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, 60);
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
});

test('F-406-09 F: observed fallback telemetry survives late second response, late semantics are rejected, and no third fallback starts', { concurrency: false }, async () => {
  const context = contextWithGraph();
  const remainingAfterFirstMs = 300_000 - 175_000 - 1;
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 15, 15), elapsedMs: 1 },
    { provider: 'gemini', semantic: 'valid', usage: tokenUsage('gemini', 10, 10), elapsedMs: remainingAfterFirstMs + 1, content: '{"summary":"late-b"}' },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 1, 1), content: '{"summary":"must-not-run"}' },
  ], { offsetMs: 175_000, allowlist: ['openai', 'gemini', 'anthropic'], maxProviderAttempts: 3 });
  assert.equal(execution.fetchCalls, 2);
  assert.equal(execution.result.ok, false);
  assert.equal(execution.result.result, '');
  assert.ok(execution.result.warnings.includes('trajectory_deadline_reached'));
  assert.equal(execution.result.telemetry.attempts.length, 2);
  assert.equal(execution.result.telemetry.attempts[1].semanticDisposition, 'DEADLINE_REJECTED');
  assert.equal(execution.telemetry.inputTokens.value, 25);
  assert.equal(execution.telemetry.outputTokens.value, 25);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, 50);
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
  assert.equal(graph(context).stop.reason, 'EXECUTION_DEADLINE_REACHED');
});

test('F-406-09 G: observed first attempt plus timeout/no-usage fallback preserves partial evidence but complete operation is NOT_OBSERVED', { concurrency: false }, async () => {
  const context = contextWithGraph({ maxObservedTokens: 100 });
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 20, 10, { cost: 0.04, currency: 'USD' }) },
    { provider: 'anthropic', semantic: 'throw' },
  ], { offsetMs: 210_000, allowlist: ['openai', 'anthropic'], maxProviderAttempts: 2 });
  assert.equal(execution.result.ok, false);
  assert.equal(execution.telemetry.providerAttempts[0].tokenUsageDisposition, 'USAGE_OBSERVED');
  assert.equal(execution.telemetry.providerAttempts[0].inputTokens.value, 20);
  assert.equal(execution.telemetry.providerAttempts[1].usageDisposition, 'USAGE_NOT_OBSERVED');
  assert.equal(execution.telemetry.operationTokenUsageCompleteness, 'INCOMPLETE_FOR_BOUND_EVALUATION');
  assert.equal(execution.telemetry.inputTokens.value, null);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, null);
  assert.notEqual(graph(context).runtimeControls.usage.tokens.used, 0);
  assert.equal(graph(context).runtimeControls.usage.tokens.unobservedCalls, 1);
  assert.equal(graph(context).stop.reason, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT');
});

test('F-406-09 H: checkpoint/reentry preserves cumulative multi-attempt accounting without recount', { concurrency: false }, async () => {
  const context = contextWithGraph();
  const execution = await executeOperation(context, [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 5, 5, { cost: 0.02, currency: 'USD' }) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 7, 3, { cost: 0.01, currency: 'USD' }) },
  ], { offsetMs: 245_000, allowlist: ['openai', 'anthropic'] });
  const beforeTokens = graph(context).runtimeControls.usage.tokens.used;
  const beforeCost = graph(context).runtimeControls.usage.providerCost.used;
  const stored = JSON.parse(JSON.stringify(checkpointContextProjection(context))) as KernelContext;
  const restored = mergeCheckpointContext(contextWithGraph(), stored);
  const restoredGraph = taskGraphFromContext(restored);
  assert.ok(restoredGraph);
  assert.equal(restoredGraph.runtimeControls.usage.tokens.used, beforeTokens);
  assert.equal(restoredGraph.runtimeControls.usage.providerCost.used, beforeCost);
  assert.equal(restoredGraph.runtimeControls.usage.modelCalls.used, 1);
  assert.equal(row(restored.metadata.llmRuntime).runtimeModelCallId, execution.callId);
  assert.equal((row(restored.metadata.llmRuntime).providerAttemptTelemetry as unknown[]).length, 2);
  const replay = observeRuntimeModelTelemetry(restored, 'risk_agent');
  assert.equal(replay.duplicate, true);
  assert.equal(restoredGraph.runtimeControls.usage.tokens.used, beforeTokens);
  assert.equal(restoredGraph.runtimeControls.usage.providerCost.used, beforeCost);
  assert.equal(restoredGraph.runtimeControls.usage.modelCalls.used, 1);
});

test('F-406-09 I: duplicate terminal processing for the same runtimeModelCallId is an accounting no-op', { concurrency: false }, () => {
  const context = contextWithGraph();
  assert.equal(reserveRuntimeModelCall(context, 'risk_agent', graphStart(context) + 260_000).allowed, true);
  const callId = currentCallId(context);
  const telemetry = normalizeObservedGenAiTelemetry({
    ok: true,
    provider: 'anthropic',
    model: 'f09-terminal',
    usage: { sfi_operation_provider_attempts: [
      { provider: 'openai', model: 'a', usage: tokenUsage('openai', 4, 1), latency_ms: 3, source: 'PROVIDER_RESPONSE', semantic_disposition: 'REJECTED_EMPTY' },
      { provider: 'anthropic', model: 'b', usage: tokenUsage('anthropic', 3, 2), latency_ms: 4, source: 'PROVIDER_RESPONSE', semantic_disposition: 'ACCEPTED' },
    ] },
    latencyMs: 7,
  });
  context.metadata = { ...context.metadata, llmRuntime: { ...row(context.metadata.llmRuntime), ...compactObservedGenAiTelemetry(telemetry), telemetryRuntimeModelCallId: callId } };
  const first = observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(first.duplicate, undefined);
  const beforeTokens = graph(context).runtimeControls.usage.tokens.used;
  const beforeUnobserved = graph(context).runtimeControls.usage.tokens.unobservedCalls;
  const duplicate = observeRuntimeModelTelemetry(context, 'risk_agent');
  assert.equal(duplicate.duplicate, true);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, beforeTokens);
  assert.equal(graph(context).runtimeControls.usage.tokens.unobservedCalls, beforeUnobserved);
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 1);
});

test('F-406-03/09 J: cumulative attempt telemetry from operation 1 never contaminates operation 2', { concurrency: false }, async () => {
  const context = contextWithGraph();
  const first = await executeOperation(context, [
    { provider: 'gemini', semantic: 'empty', usage: tokenUsage('gemini', 4, 1) },
    { provider: 'anthropic', semantic: 'valid', usage: tokenUsage('anthropic', 3, 2) },
  ], { offsetMs: 280_000, preferredProvider: 'gemini', allowlist: ['gemini', 'anthropic'] });
  const firstCallId = first.callId;
  assert.deepEqual(first.telemetry.providerAttempts.map((attempt) => attempt.provider.value), ['gemini', 'anthropic']);

  const second = await executeOperation(context, [
    { provider: 'openai', semantic: 'valid', usage: tokenUsage('openai', 4, 2) },
  ], { offsetMs: 282_000, preferredProvider: 'openai', allowlist: ['openai'], maxProviderAttempts: 1 });
  assert.notEqual(second.callId, firstCallId);
  assert.equal(second.telemetry.providerAttempts.length, 0, 'single-attempt legacy telemetry must replace, not inherit, prior multi-attempt detail');
  assert.deepEqual(row(context.metadata.llmRuntime).providerAttemptTelemetry, []);
  assert.equal(row(context.metadata.llmRuntime).observedProvider, 'openai');
  assert.equal(graph(context).runtimeControls.usage.modelCalls.used, 2);
  assert.equal(graph(context).runtimeControls.usage.tokens.used, 16);
});

test('F-406-07/09 K: cumulative-only bound STOP is terminal before proposal or capability negotiation', { concurrency: false }, async () => {
  const context = contextWithGraph({ maxObservedTokens: 100 });
  context.metadata = { ...context.metadata, llmAugmentation: true };
  const originalNow = Date.now;
  const originalFetch = globalThis.fetch;
  let now = graphStart(context) + 290_000;
  let fetchCalls = 0;
  let proposals = 0;
  const specs: AttemptSpec[] = [
    { provider: 'openai', semantic: 'empty', usage: tokenUsage('openai', 60, 30) },
    { provider: 'huggingface', semantic: 'valid', usage: tokenUsage('huggingface', 10, 10), content: '{"summary":"accepted-but-bound-terminal"}' },
  ];
  Date.now = () => now;
  globalThis.fetch = (async (request: RequestInfo | URL) => {
    const spec = specs[fetchCalls++];
    assert.ok(spec);
    assert.equal(providerFromUrl(String(request)), spec.provider);
    now += 1;
    return responseFor(spec);
  }) as typeof fetch;
  try {
    const executed = await runCognitiveAgent('risk_agent', context, {
      nowMs: () => now,
      executeAgent: (_agentId: string, current: KernelContext) => current,
      augmentAgentWithLlm: async (_agentId: string, current: KernelContext) => {
        const result = await runLlmTask({
          task: 'draft',
          prompt: 'F-406-09 runtime terminality',
          fallbackResult: '{"status":"LLM_UNAVAILABLE"}',
          preferredProvider: 'openai',
          requirements: {
            providerAllowlist: ['openai', 'huggingface'],
            reasoning: true,
            costClass: 'STANDARD',
          },
          maxProviderAttempts: 2,
          deadlineAtMs: graphDeadline(current),
        });
        applyResultTelemetry(current, result);
        current.metadata = { ...current.metadata, agentInsights: { ...row(current.metadata.agentInsights), risk_agent: { status: 'COMPLETE', summary: result.result } } };
        return current;
      },
      emitGovernedProposals: async (_agentId: string, current: KernelContext) => { proposals += 1; return current; },
      recordExecutionEvent: async () => undefined,
    });
    assert.equal(fetchCalls, 2);
    assert.equal(graph(executed.context).runtimeControls.usage.modelCalls.used, 1);
    assert.equal(graph(executed.context).runtimeControls.usage.tokens.used, 110);
    assert.equal(graph(executed.context).stop.reason, 'MAX_OBSERVED_TOKENS_REACHED');
    assert.equal(proposals, 0);

    executed.context.metadata = { ...executed.context.metadata, capabilityRequests: [request('f09-after-cumulative-stop')] };
    const riskNode = graph(executed.context).nodes.find((node) => node.capabilityId === 'risk_agent');
    assert.ok(riskNode);
    let negotiations = 0;
    await executeAdaptiveCapabilityRequestsForNode({
      context: executed.context,
      parentNodeId: riskNode.nodeId,
      parentCapabilityId: 'risk_agent',
      requestCapability: async () => { negotiations += 1; throw new Error('terminal cumulative STOP must block capability negotiation'); },
    });
    assert.equal(negotiations, 0);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
  }
});
