export const SFI_GENAI_TELEMETRY_CONTRACT = 'SFI-GENAI-TELEMETRY-1.0' as const;

export type SfiGenAiProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'huggingface';
export type SfiObservedValue<T> = { value: T | null; observation: 'OBSERVED' | 'NOT_OBSERVED' };
export type SfiUsageCompleteness = 'COMPLETE' | 'INCOMPLETE_FOR_BOUND_EVALUATION';
export type SfiProviderAttemptUsageDisposition = 'USAGE_OBSERVED' | 'USAGE_NOT_OBSERVED';

type Row = Record<string, unknown>;

export type SfiProviderAttemptTelemetry = {
  provider: SfiObservedValue<SfiGenAiProvider>;
  model: SfiObservedValue<string>;
  inputTokens: SfiObservedValue<number>;
  outputTokens: SfiObservedValue<number>;
  providerCost: SfiObservedValue<number>;
  providerCostCurrency: SfiObservedValue<string>;
  latencyMs: SfiObservedValue<number>;
  usageSourceFields: string[];
  source: 'PROVIDER_RESPONSE' | 'PROVIDER_ATTEMPT' | 'NOT_AVAILABLE';
  semanticDisposition: string;
  usageDisposition: SfiProviderAttemptUsageDisposition;
  tokenUsageDisposition: SfiProviderAttemptUsageDisposition;
  providerCostUsageDisposition: SfiProviderAttemptUsageDisposition;
};

export type SfiGenAiTelemetry = {
  contractVersion: typeof SFI_GENAI_TELEMETRY_CONTRACT;
  provider: SfiObservedValue<SfiGenAiProvider>;
  model: SfiObservedValue<string>;
  inputTokens: SfiObservedValue<number>;
  outputTokens: SfiObservedValue<number>;
  providerCost: SfiObservedValue<number>;
  providerCostCurrency: SfiObservedValue<string>;
  latencyMs: SfiObservedValue<number>;
  usageSourceFields: string[];
  providerAttempts: SfiProviderAttemptTelemetry[];
  operationTokenUsageCompleteness: SfiUsageCompleteness;
  operationProviderCostCompleteness: SfiUsageCompleteness;
  boundary: 'PROVIDER_OR_RUNTIME_OBSERVATION_ONLY_NO_ESTIMATION';
};

export type SfiGenAiOtelInterop = {
  contractVersion: typeof SFI_GENAI_TELEMETRY_CONTRACT;
  mappingAuthority: 'INTEROPERABILITY_ONLY';
  attributes: Record<string, string | number>;
  metrics: {
    'gen_ai.client.operation.duration'?: { value: number; unit: 's' };
  };
  contentCaptured: false;
  boundary: 'OTEL_MAPPING_IS_NOT_SFI_EVIDENCE_OR_TRUTH_AUTHORITY';
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function finiteNonNegative(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = finiteNonNegative(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function text(value: unknown, max = 120): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

function observed<T>(value: T | null): SfiObservedValue<T> {
  return value === null ? { value: null, observation: 'NOT_OBSERVED' } : { value, observation: 'OBSERVED' };
}

function firstNumber(source: Row, keys: string[], sourceFields: Set<string>, integer = false) {
  for (const key of keys) {
    const parsed = integer ? positiveInteger(source[key]) : finiteNonNegative(source[key]);
    if (parsed !== null) {
      sourceFields.add(key);
      return parsed;
    }
  }
  return null;
}

function providerUsageTokens(provider: SfiGenAiProvider, usage: Row, sourceFields: Set<string>) {
  if (provider === 'gemini') {
    return {
      input: firstNumber(usage, ['promptTokenCount'], sourceFields, true),
      output: firstNumber(usage, ['candidatesTokenCount'], sourceFields, true),
    };
  }
  if (provider === 'ollama') {
    return {
      input: firstNumber(usage, ['prompt_eval_count'], sourceFields, true),
      output: firstNumber(usage, ['eval_count'], sourceFields, true),
    };
  }
  if (provider === 'anthropic') {
    return {
      input: firstNumber(usage, ['input_tokens'], sourceFields, true),
      output: firstNumber(usage, ['output_tokens'], sourceFields, true),
    };
  }
  return {
    input: firstNumber(usage, ['prompt_tokens', 'input_tokens'], sourceFields, true),
    output: firstNumber(usage, ['completion_tokens', 'output_tokens'], sourceFields, true),
  };
}

function providerCost(usage: Row, sourceFields: Set<string>) {
  return firstNumber(usage, ['cost', 'total_cost', 'cost_usd', 'total_cost_usd'], sourceFields, false);
}

function providerCurrency(usage: Row, sourceFields: Set<string>) {
  const direct = text(usage.currency, 16) ?? text(usage.cost_currency, 16);
  if (direct) {
    sourceFields.add(text(usage.currency, 16) ? 'currency' : 'cost_currency');
    return direct.toUpperCase();
  }
  return null;
}

function validProvider(value: unknown): SfiGenAiProvider | null {
  return typeof value === 'string' && ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'].includes(value)
    ? value as SfiGenAiProvider
    : null;
}

function normalizeSingleProvider(input: {
  ok: boolean;
  provider: unknown;
  model: unknown;
  usage: unknown;
  latencyMs: unknown;
}) {
  const provider = input.ok ? validProvider(input.provider) : null;
  const model = input.ok ? text(input.model, 500) : null;
  const usage = input.ok ? row(input.usage) : {};
  const sourceFields = new Set<string>();
  const tokens = provider ? providerUsageTokens(provider, usage, sourceFields) : { input: null, output: null };
  const cost = provider ? providerCost(usage, sourceFields) : null;
  const currency = cost !== null ? providerCurrency(usage, sourceFields) : null;
  const latency = input.ok ? finiteNonNegative(input.latencyMs) : null;
  return {
    provider,
    model,
    inputTokens: tokens.input,
    outputTokens: tokens.output,
    providerCost: cost,
    providerCostCurrency: currency,
    latencyMs: latency,
    usageSourceFields: [...sourceFields],
  };
}

function attemptRows(usage: unknown): Row[] | null {
  const envelope = row(usage);
  if (!Array.isArray(envelope.sfi_operation_provider_attempts)) return null;
  return envelope.sfi_operation_provider_attempts.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

function normalizeProviderAttempts(usage: unknown): SfiProviderAttemptTelemetry[] | null {
  const attempts = attemptRows(usage);
  if (!attempts) return null;
  return attempts.map((attempt) => {
    const normalized = normalizeSingleProvider({
      ok: true,
      provider: attempt.provider,
      model: attempt.model,
      usage: attempt.usage,
      latencyMs: attempt.latency_ms,
    });
    const tokenObserved = normalized.inputTokens !== null && normalized.outputTokens !== null;
    const costObserved = normalized.providerCost !== null && normalized.providerCostCurrency !== null;
    const source = attempt.source === 'PROVIDER_RESPONSE' || attempt.source === 'PROVIDER_ATTEMPT'
      ? attempt.source
      : 'NOT_AVAILABLE';
    return {
      provider: observed(normalized.provider),
      model: observed(normalized.model),
      inputTokens: observed(normalized.inputTokens),
      outputTokens: observed(normalized.outputTokens),
      providerCost: observed(normalized.providerCost),
      providerCostCurrency: observed(normalized.providerCostCurrency),
      latencyMs: observed(normalized.latencyMs),
      usageSourceFields: normalized.usageSourceFields,
      source,
      semanticDisposition: text(attempt.semantic_disposition, 80) ?? 'UNSPECIFIED',
      usageDisposition: tokenObserved || costObserved ? 'USAGE_OBSERVED' : 'USAGE_NOT_OBSERVED',
      tokenUsageDisposition: tokenObserved ? 'USAGE_OBSERVED' : 'USAGE_NOT_OBSERVED',
      providerCostUsageDisposition: costObserved ? 'USAGE_OBSERVED' : 'USAGE_NOT_OBSERVED',
    };
  });
}

export function normalizeObservedGenAiTelemetry(input: {
  ok: boolean;
  provider: string;
  model: string;
  usage: unknown;
  latencyMs: unknown;
}): SfiGenAiTelemetry {
  const providerAttempts = normalizeProviderAttempts(input.usage);
  if (providerAttempts) {
    const provider = input.ok ? validProvider(input.provider) : null;
    const model = input.ok ? text(input.model, 500) : null;
    const latency = input.ok ? finiteNonNegative(input.latencyMs) : null;
    const tokenComplete = providerAttempts.length > 0 && providerAttempts.every((attempt) =>
      attempt.inputTokens.observation === 'OBSERVED' && attempt.outputTokens.observation === 'OBSERVED');
    const inputTokens = tokenComplete
      ? providerAttempts.reduce((sum, attempt) => sum + (attempt.inputTokens.value ?? 0), 0)
      : null;
    const outputTokens = tokenComplete
      ? providerAttempts.reduce((sum, attempt) => sum + (attempt.outputTokens.value ?? 0), 0)
      : null;

    const costComponentsComplete = providerAttempts.length > 0 && providerAttempts.every((attempt) =>
      attempt.providerCost.observation === 'OBSERVED' && attempt.providerCostCurrency.observation === 'OBSERVED');
    const currencies = new Set(providerAttempts.flatMap((attempt) =>
      attempt.providerCostCurrency.value ? [attempt.providerCostCurrency.value] : []));
    const costComplete = costComponentsComplete && currencies.size === 1;
    const cost = costComplete
      ? providerAttempts.reduce((sum, attempt) => sum + (attempt.providerCost.value ?? 0), 0)
      : null;
    const currency = costComplete ? [...currencies][0] ?? null : null;
    const sourceFields = [...new Set(providerAttempts.flatMap((attempt) => attempt.usageSourceFields))];

    return {
      contractVersion: SFI_GENAI_TELEMETRY_CONTRACT,
      provider: observed(provider),
      model: observed(model),
      inputTokens: observed(inputTokens),
      outputTokens: observed(outputTokens),
      providerCost: observed(cost),
      providerCostCurrency: observed(currency),
      latencyMs: observed(latency),
      usageSourceFields: sourceFields,
      providerAttempts,
      operationTokenUsageCompleteness: tokenComplete ? 'COMPLETE' : 'INCOMPLETE_FOR_BOUND_EVALUATION',
      operationProviderCostCompleteness: costComplete ? 'COMPLETE' : 'INCOMPLETE_FOR_BOUND_EVALUATION',
      boundary: 'PROVIDER_OR_RUNTIME_OBSERVATION_ONLY_NO_ESTIMATION',
    };
  }

  const normalized = normalizeSingleProvider(input);
  const tokenComplete = normalized.inputTokens !== null && normalized.outputTokens !== null;
  const costComplete = normalized.providerCost !== null && normalized.providerCostCurrency !== null;
  return {
    contractVersion: SFI_GENAI_TELEMETRY_CONTRACT,
    provider: observed(normalized.provider),
    model: observed(normalized.model),
    inputTokens: observed(normalized.inputTokens),
    outputTokens: observed(normalized.outputTokens),
    providerCost: observed(normalized.providerCost),
    providerCostCurrency: observed(normalized.providerCostCurrency),
    latencyMs: observed(normalized.latencyMs),
    usageSourceFields: normalized.usageSourceFields,
    providerAttempts: [],
    operationTokenUsageCompleteness: tokenComplete ? 'COMPLETE' : 'INCOMPLETE_FOR_BOUND_EVALUATION',
    operationProviderCostCompleteness: costComplete ? 'COMPLETE' : 'INCOMPLETE_FOR_BOUND_EVALUATION',
    boundary: 'PROVIDER_OR_RUNTIME_OBSERVATION_ONLY_NO_ESTIMATION',
  };
}

export function compactObservedGenAiTelemetry(telemetry: SfiGenAiTelemetry) {
  return {
    telemetryContractVersion: telemetry.contractVersion,
    observedProvider: telemetry.provider.value,
    observedModel: telemetry.model.value,
    observedInputTokens: telemetry.inputTokens.value,
    observedOutputTokens: telemetry.outputTokens.value,
    observedProviderCost: telemetry.providerCost.value,
    observedProviderCostCurrency: telemetry.providerCostCurrency.value,
    observedLatencyMs: telemetry.latencyMs.value,
    usageSourceFields: telemetry.usageSourceFields,
    providerAttemptTelemetry: telemetry.providerAttempts,
    operationTokenUsageCompleteness: telemetry.operationTokenUsageCompleteness,
    operationProviderCostCompleteness: telemetry.operationProviderCostCompleteness,
    telemetryBoundary: telemetry.boundary,
  };
}

export function mapGenAiTelemetryToOpenTelemetry(telemetry: SfiGenAiTelemetry): SfiGenAiOtelInterop {
  const attributes: Record<string, string | number> = {};
  if (telemetry.provider.observation === 'OBSERVED' && telemetry.provider.value) attributes['gen_ai.provider.name'] = telemetry.provider.value;
  if (telemetry.model.observation === 'OBSERVED' && telemetry.model.value) attributes['gen_ai.response.model'] = telemetry.model.value;
  if (telemetry.inputTokens.observation === 'OBSERVED' && telemetry.inputTokens.value !== null) attributes['gen_ai.usage.input_tokens'] = telemetry.inputTokens.value;
  if (telemetry.outputTokens.observation === 'OBSERVED' && telemetry.outputTokens.value !== null) attributes['gen_ai.usage.output_tokens'] = telemetry.outputTokens.value;
  const metrics: SfiGenAiOtelInterop['metrics'] = {};
  if (telemetry.latencyMs.observation === 'OBSERVED' && telemetry.latencyMs.value !== null) {
    metrics['gen_ai.client.operation.duration'] = { value: telemetry.latencyMs.value / 1000, unit: 's' };
  }
  return {
    contractVersion: SFI_GENAI_TELEMETRY_CONTRACT,
    mappingAuthority: 'INTEROPERABILITY_ONLY',
    attributes,
    metrics,
    contentCaptured: false,
    boundary: 'OTEL_MAPPING_IS_NOT_SFI_EVIDENCE_OR_TRUTH_AUTHORITY',
  };
}
