import { validateTaskGraphStructure } from './adaptiveTaskGraphRuntime';
import type { KernelContext } from './kernelContext';
import {
  SFI_ADAPTIVE_EXECUTION_DEADLINE_MS,
  SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS,
  SFI_ADAPTIVE_MAX_MODEL_CALLS,
  SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH,
  type SfiRuntimeBoundOverrides,
  type SfiTaskGraph,
} from './types';

export const SFI_RUNTIME_STOP_COST_CONTROLS_CONTRACT = 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0' as const;
export const SFI_RUNTIME_STOP_COST_CONTROLS_GATE = 'SFI-RUNTIME-STOP-COST-CONTROLS-1.0' as const;

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function optionalNumber(source: Row, key: string) {
  if (!(key in source) || source[key] === null || source[key] === undefined) return undefined;
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`RUNTIME_LIMIT_CONFIG_INVALID:${key}`);
  return value;
}

export function runtimeBoundOverridesFromContext(context: KernelContext): SfiRuntimeBoundOverrides {
  const source = row(context.metadata?.cognitiveRuntimeLimits);
  const costSource = row(source.maxObservedProviderCost);
  const maxObservedProviderCost = 'maxObservedProviderCost' in source
    ? {
        amount: optionalNumber(costSource, 'amount') ?? Number.NaN,
        currency: typeof costSource.currency === 'string' ? costSource.currency : '',
      }
    : undefined;
  return {
    maxDepth: optionalNumber(source, 'maxDepth'),
    maxCapabilityInvocations: optionalNumber(source, 'maxCapabilityInvocations'),
    maxModelCalls: optionalNumber(source, 'maxModelCalls'),
    deadlineMs: optionalNumber(source, 'deadlineMs'),
    maxObservedTokens: optionalNumber(source, 'maxObservedTokens'),
    maxObservedProviderCost,
  };
}

function taskGraph(context: KernelContext): SfiTaskGraph | null {
  const candidate = context.metadata?.taskGraph;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const graph = candidate as SfiTaskGraph;
  return graph.mode === 'ADAPTIVE' ? graph : null;
}

function finiteNonNegative(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function nonNegativeInteger(value: unknown): number | null {
  const parsed = finiteNonNegative(value);
  return parsed !== null && Number.isSafeInteger(parsed) ? parsed : null;
}

function mutation(graph: SfiTaskGraph, kind: 'LIMIT_BLOCKED' | 'STOPPED', nodeId: string | null, detail: Record<string, unknown>) {
  if (!Array.isArray(graph.mutations)) return;
  graph.mutations.push({
    mutationId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    kind,
    nodeId,
    requestId: null,
    detail,
  });
}

function stopGraph(graph: SfiTaskGraph, reason: string, nodeId: string | null, detail: Record<string, unknown> = {}) {
  if (graph.stop && typeof graph.stop === 'object' && graph.stop.stopped) return graph.stop.reason ?? reason;
  mutation(graph, 'LIMIT_BLOCKED', nodeId, { reason, ...detail });
  graph.stop = { stopped: true, reason, evaluatedAt: new Date().toISOString() };
  graph.status = 'stopped';
  mutation(graph, 'STOPPED', nodeId, { reason });
  return reason;
}

export function validateRuntimeStopCostControls(graph: SfiTaskGraph, evaluationTimeMs = Date.now()): string[] {
  const controls = graph.runtimeControls;
  if (!controls || typeof controls !== 'object') return ['RUNTIME_CONTROLS_REQUIRED'];
  if (!controls.bounds || typeof controls.bounds !== 'object') return ['RUNTIME_BOUNDS_REQUIRED'];
  if (!controls.usage || typeof controls.usage !== 'object') return ['RUNTIME_USAGE_REQUIRED'];
  if (!controls.usage.modelCalls || !controls.usage.tokens || !controls.usage.providerCost) return ['RUNTIME_USAGE_COMPONENT_REQUIRED'];

  const errors: string[] = [];
  if (!Number.isFinite(evaluationTimeMs)) errors.push('EVALUATION_CLOCK_INVALID');
  if (controls.contract !== SFI_RUNTIME_STOP_COST_CONTROLS_CONTRACT) errors.push('RUNTIME_CONTROLS_CONTRACT_MISMATCH');
  if (controls.observabilityBoundary !== 'UNAVAILABLE_NOT_ZERO_NO_ESTIMATION') errors.push('OBSERVABILITY_BOUNDARY_MISMATCH');
  const bounds = controls.bounds;
  if (!Number.isSafeInteger(bounds.maxDepth) || bounds.maxDepth < 0 || bounds.maxDepth > SFI_ADAPTIVE_MAX_TRAJECTORY_DEPTH) errors.push('MAX_DEPTH_INVALID');
  if (!Number.isSafeInteger(bounds.maxCapabilityInvocations) || bounds.maxCapabilityInvocations <= 0 || bounds.maxCapabilityInvocations > SFI_ADAPTIVE_MAX_CAPABILITY_INVOCATIONS) errors.push('MAX_CAPABILITY_INVOCATIONS_INVALID');
  if (bounds.maxCapabilityInvocations !== graph.invocationBudget?.max) errors.push('CAPABILITY_INVOCATION_LIMIT_MISMATCH');
  if (!Number.isSafeInteger(bounds.maxModelCalls) || bounds.maxModelCalls <= 0 || bounds.maxModelCalls > SFI_ADAPTIVE_MAX_MODEL_CALLS) errors.push('MAX_MODEL_CALLS_INVALID');
  if (!Number.isSafeInteger(bounds.maxDurationMs) || bounds.maxDurationMs <= 0 || bounds.maxDurationMs > SFI_ADAPTIVE_EXECUTION_DEADLINE_MS) errors.push('DEADLINE_DURATION_INVALID');
  const startedAt = new Date(bounds.startedAt).getTime();
  const deadlineAt = new Date(bounds.deadlineAt).getTime();
  if (!Number.isFinite(startedAt)) errors.push('STARTED_AT_INVALID');
  if (!Number.isFinite(deadlineAt)) errors.push('DEADLINE_AT_INVALID');
  if (Number.isFinite(startedAt) && Number.isFinite(deadlineAt)) {
    if (deadlineAt <= startedAt) errors.push('DEADLINE_ORDER_INVALID');
    if (deadlineAt - startedAt !== bounds.maxDurationMs) errors.push('DEADLINE_INTERVAL_INVALID');
    if (Number.isFinite(evaluationTimeMs) && startedAt > evaluationTimeMs) errors.push('STARTED_AT_IN_FUTURE');
    if (Number.isFinite(evaluationTimeMs) && deadlineAt - evaluationTimeMs > bounds.maxDurationMs) errors.push('RESTORED_TIME_EXTENSION_INVALID');
  }
  if (bounds.maxObservedTokens !== null && (!Number.isSafeInteger(bounds.maxObservedTokens) || bounds.maxObservedTokens <= 0)) errors.push('MAX_OBSERVED_TOKENS_INVALID');
  if (bounds.maxObservedProviderCost !== null && (!Number.isFinite(bounds.maxObservedProviderCost.amount) || bounds.maxObservedProviderCost.amount <= 0 || !bounds.maxObservedProviderCost.currency.trim())) errors.push('MAX_OBSERVED_PROVIDER_COST_INVALID');

  const model = controls.usage.modelCalls;
  if (model.observation !== 'OBSERVED' || !Number.isSafeInteger(model.used) || model.used < 0 || model.used > bounds.maxModelCalls || model.remaining !== bounds.maxModelCalls - model.used) errors.push('MODEL_CALL_USAGE_INVALID');
  const tokens = controls.usage.tokens;
  if (!Number.isSafeInteger(tokens.unobservedCalls) || tokens.unobservedCalls < 0) errors.push('TOKEN_UNOBSERVED_COUNT_INVALID');
  if (tokens.observation === 'NOT_OBSERVED' && (tokens.used !== null || tokens.remaining !== null)) errors.push('UNOBSERVED_TOKENS_MUST_BE_NULL');
  if (tokens.observation === 'OBSERVED' && (tokens.used === null || !Number.isSafeInteger(tokens.used) || tokens.used < 0)) errors.push('OBSERVED_TOKENS_INVALID');
  const cost = controls.usage.providerCost;
  if (!Number.isSafeInteger(cost.unobservedCalls) || cost.unobservedCalls < 0) errors.push('COST_UNOBSERVED_COUNT_INVALID');
  if (cost.observation === 'NOT_OBSERVED' && (cost.used !== null || cost.remaining !== null || cost.currency !== null)) errors.push('UNOBSERVED_COST_MUST_BE_NULL');
  if (cost.observation === 'OBSERVED' && (cost.used === null || !Number.isFinite(cost.used) || cost.used < 0 || !cost.currency)) errors.push('OBSERVED_COST_INVALID');
  return errors;
}

function assertRuntimeControls(graph: SfiTaskGraph, evaluationTimeMs = Date.now()) {
  const errors = validateRuntimeStopCostControls(graph, evaluationTimeMs);
  if (errors.length) throw new Error(`RUNTIME_STOP_COST_CONTROLS_INVALID:${errors.join('|')}`);
}

function activeNode(graph: SfiTaskGraph, capabilityId: string) {
  return Array.isArray(graph.nodes)
    ? [...graph.nodes].reverse().find((node) => node.capabilityId === capabilityId && node.state !== 'SUPERSEDED') ?? null
    : null;
}

export function clearRuntimeModelTelemetryObservation(context: KernelContext) {
  const prior = row(context.metadata?.llmRuntime);
  context.metadata = {
    ...context.metadata,
    llmRuntime: {
      ...prior,
      observedProvider: null,
      observedModel: null,
      observedInputTokens: null,
      observedOutputTokens: null,
      observedProviderCost: null,
      observedProviderCostCurrency: null,
      observedLatencyMs: null,
      telemetryOpenTelemetry: null,
    },
  };
  return context;
}

export function runtimeExecutionPreflight(context: KernelContext, capabilityId: string, nowMs = Date.now()) {
  const graph = taskGraph(context);
  if (!graph) return { allowed: true, tracked: false, reason: null } as const;

  const controlErrors = validateRuntimeStopCostControls(graph, nowMs);
  const structureErrors = validateTaskGraphStructure(graph);
  const restoredErrors = [...controlErrors, ...structureErrors];
  if (restoredErrors.length) {
    const reason = stopGraph(graph, 'RESTORED_RUNTIME_STATE_INVALID', null, { errors: restoredErrors });
    return { allowed: false, tracked: true, reason, errors: restoredErrors } as const;
  }

  if (graph.stop.stopped) return { allowed: false, tracked: true, reason: graph.stop.reason ?? 'RUNTIME_ALREADY_STOPPED' } as const;
  const node = activeNode(graph, capabilityId);
  if (node && node.depth > graph.runtimeControls.bounds.maxDepth) {
    const reason = stopGraph(graph, 'MAX_TRAJECTORY_DEPTH_REACHED', node.nodeId, { depth: node.depth, maxDepth: graph.runtimeControls.bounds.maxDepth });
    return { allowed: false, tracked: true, reason } as const;
  }
  const deadlineAt = new Date(graph.runtimeControls.bounds.deadlineAt).getTime();
  if (nowMs >= deadlineAt) {
    const reason = stopGraph(graph, 'EXECUTION_DEADLINE_REACHED', node?.nodeId ?? null, { deadlineAt: graph.runtimeControls.bounds.deadlineAt });
    return { allowed: false, tracked: true, reason } as const;
  }
  return { allowed: true, tracked: true, reason: null } as const;
}

export function reserveRuntimeModelCall(context: KernelContext, capabilityId: string, nowMs = Date.now()) {
  const preflight = runtimeExecutionPreflight(context, capabilityId, nowMs);
  if (!preflight.allowed) return preflight;
  const graph = taskGraph(context);
  if (!graph) return { allowed: true, tracked: false, reason: null } as const;
  const usage = graph.runtimeControls.usage.modelCalls;
  if (usage.used >= graph.runtimeControls.bounds.maxModelCalls || usage.remaining <= 0) {
    const node = activeNode(graph, capabilityId);
    const reason = stopGraph(graph, 'MAX_MODEL_CALLS_REACHED', node?.nodeId ?? null, {
      used: usage.used,
      max: graph.runtimeControls.bounds.maxModelCalls,
    });
    return { allowed: false, tracked: true, reason } as const;
  }
  usage.used += 1;
  usage.remaining = graph.runtimeControls.bounds.maxModelCalls - usage.used;
  clearRuntimeModelTelemetryObservation(context);
  return { allowed: true, tracked: true, reason: null } as const;
}

export function observeRuntimeModelTelemetry(context: KernelContext, capabilityId: string) {
  const graph = taskGraph(context);
  if (!graph) return { tracked: false, stopped: false, reason: null } as const;
  assertRuntimeControls(graph);
  const llm = row(context.metadata?.llmRuntime);
  const inputTokens = nonNegativeInteger(llm.observedInputTokens);
  const outputTokens = nonNegativeInteger(llm.observedOutputTokens);
  const costAmount = finiteNonNegative(llm.observedProviderCost);
  const costCurrency = typeof llm.observedProviderCostCurrency === 'string' && llm.observedProviderCostCurrency.trim()
    ? llm.observedProviderCostCurrency.trim().toUpperCase()
    : null;
  const node = activeNode(graph, capabilityId);
  const tokenUsage = graph.runtimeControls.usage.tokens;
  const tokenBound = graph.runtimeControls.bounds.maxObservedTokens;

  if (inputTokens === null || outputTokens === null) {
    tokenUsage.unobservedCalls += 1;
    tokenUsage.observation = 'NOT_OBSERVED';
    tokenUsage.used = null;
    tokenUsage.remaining = null;
    if (tokenBound !== null) {
      const reason = stopGraph(graph, 'TOKEN_USAGE_NOT_OBSERVED_FOR_CONFIGURED_LIMIT', node?.nodeId ?? null, { maxObservedTokens: tokenBound });
      return { tracked: true, stopped: true, reason } as const;
    }
  } else if (tokenUsage.unobservedCalls === 0) {
    const next = (tokenUsage.used ?? 0) + inputTokens + outputTokens;
    tokenUsage.observation = 'OBSERVED';
    tokenUsage.used = next;
    tokenUsage.remaining = tokenBound === null ? null : Math.max(0, tokenBound - next);
    if (tokenBound !== null && next >= tokenBound) {
      const reason = stopGraph(graph, 'MAX_OBSERVED_TOKENS_REACHED', node?.nodeId ?? null, { used: next, max: tokenBound });
      return { tracked: true, stopped: true, reason } as const;
    }
  }

  const costUsage = graph.runtimeControls.usage.providerCost;
  const costBound = graph.runtimeControls.bounds.maxObservedProviderCost;
  if (costAmount === null || costCurrency === null) {
    costUsage.unobservedCalls += 1;
    costUsage.observation = 'NOT_OBSERVED';
    costUsage.used = null;
    costUsage.remaining = null;
    costUsage.currency = null;
    if (costBound !== null) {
      const reason = stopGraph(graph, 'PROVIDER_COST_NOT_OBSERVED_FOR_CONFIGURED_LIMIT', node?.nodeId ?? null, { maxObservedProviderCost: costBound });
      return { tracked: true, stopped: true, reason } as const;
    }
  } else if (costUsage.unobservedCalls === 0) {
    if (costBound !== null && costCurrency !== costBound.currency) {
      const reason = stopGraph(graph, 'PROVIDER_COST_CURRENCY_MISMATCH', node?.nodeId ?? null, { observedCurrency: costCurrency, requiredCurrency: costBound.currency });
      return { tracked: true, stopped: true, reason } as const;
    }
    if (costUsage.currency && costUsage.currency !== costCurrency) {
      costUsage.unobservedCalls += 1;
      costUsage.observation = 'NOT_OBSERVED';
      costUsage.used = null;
      costUsage.remaining = null;
      costUsage.currency = null;
      const reason = stopGraph(graph, 'PROVIDER_COST_CURRENCY_CHANGED_WITHIN_TRAJECTORY', node?.nodeId ?? null);
      return { tracked: true, stopped: true, reason } as const;
    }
    const next = (costUsage.used ?? 0) + costAmount;
    costUsage.observation = 'OBSERVED';
    costUsage.used = next;
    costUsage.currency = costCurrency;
    costUsage.remaining = costBound === null ? null : Math.max(0, costBound.amount - next);
    if (costBound !== null && next >= costBound.amount) {
      const reason = stopGraph(graph, 'MAX_OBSERVED_PROVIDER_COST_REACHED', node?.nodeId ?? null, { used: next, max: costBound.amount, currency: costBound.currency });
      return { tracked: true, stopped: true, reason } as const;
    }
  }

  assertRuntimeControls(graph);
  return { tracked: true, stopped: graph.stop.stopped, reason: graph.stop.reason } as const;
}

export function runtimeControlSnapshot(context: KernelContext) {
  const graph = taskGraph(context);
  if (!graph) return null;
  return {
    contract: graph.runtimeControls.contract,
    bounds: graph.runtimeControls.bounds,
    usage: graph.runtimeControls.usage,
    observabilityBoundary: graph.runtimeControls.observabilityBoundary,
    stop: graph.stop,
  };
}
