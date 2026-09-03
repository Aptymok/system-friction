export const SFI_GENAI_TELEMETRY_CONTRACT = 'SFI-GENAI-TELEMETRY-1.0' as const;

export type SfiGenAiProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'huggingface';
export type SfiObservedValue<T> = { value: T | null; observation: 'OBSERVED' | 'NOT_OBSERVED' };

type Row = Record<string, unknown>;

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

export function normalizeObservedGenAiTelemetry(input: {
  ok: boolean;
  provider: string;
  model: string;
  usage: unknown;
  latencyMs: unknown;
}): SfiGenAiTelemetry {
  const provider = input.ok && ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'].includes(input.provider)
    ? input.provider as SfiGenAiProvider
    : null;
  const model = input.ok ? text(input.model, 500) : null;
  const usage = input.ok ? row(input.usage) : {};
  const sourceFields = new Set<string>();
  const tokens = provider ? providerUsageTokens(provider, usage, sourceFields) : { input: null, output: null };
  const cost = provider ? providerCost(usage, sourceFields) : null;
  const currency = cost !== null ? providerCurrency(usage, sourceFields) : null;
  const latency = input.ok ? finiteNonNegative(input.latencyMs) : null;

  return {
    contractVersion: SFI_GENAI_TELEMETRY_CONTRACT,
    provider: observed(provider),
    model: observed(model),
    inputTokens: observed(tokens.input),
    outputTokens: observed(tokens.output),
    providerCost: observed(cost),
    providerCostCurrency: observed(currency),
    latencyMs: observed(latency),
    usageSourceFields: [...sourceFields],
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
    contractVersion: telemetry.contractVersion,
    mappingAuthority: 'INTEROPERABILITY_ONLY',
    attributes,
    metrics,
    contentCaptured: false,
    boundary: 'OTEL_MAPPING_IS_NOT_SFI_EVIDENCE_OR_TRUTH_AUTHORITY',
  };
}
