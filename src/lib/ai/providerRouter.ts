import 'server-only';

export type LlmTask =
  | 'fast_classification'
  | 'deep_report'
  | 'context_long'
  | 'draft'
  | 'moph_reading'
  | 'ifnorm'
  | 'prediction'
  | 'report'
  | 'graph_interpretation'
  | 'web_research';

export type LlmProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'huggingface' | 'degraded';
export type LlmPriority = 'speed' | 'balanced' | 'quality';
export type ProviderFailureReason = 'rate_limit' | 'auth' | 'quota' | 'billing' | 'model_invalid' | 'transient';

export type LlmRequirements = {
  reasoning?: boolean;
  structuredOutput?: boolean;
  web?: boolean;
  multimodal?: boolean;
  minContextTokens?: number;
  priority?: LlmPriority;
};

export type LlmModelCapability = {
  provider: Exclude<LlmProviderId, 'degraded'>;
  model: string;
  role: string;
  contextTokens: number | null;
  reasoning: boolean;
  structuredOutput: boolean;
  web: boolean;
  multimodal: boolean;
  priority: LlmPriority;
  configuredBy: string[];
};

export type LlmProviderStatus = {
  id: LlmProviderId;
  /** Compatibility field. Means credential/config is present and no active circuit blocks the primary route. */
  available: boolean;
  configured: boolean;
  credentialPresent: boolean;
  model: string;
  role: string;
  configuredBy: string[];
  state: 'UNCONFIGURED' | 'UNTESTED' | 'HEALTHY' | 'DEGRADED' | 'BLOCKED';
  canaryOk: boolean | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  lastErrorClass: ProviderFailureReason | null;
  circuitOpen: boolean;
  circuitReason: ProviderFailureReason | null;
  migratedModelFrom: string | null;
  models: Array<LlmModelCapability & {
    selected: boolean;
    canaryOk: boolean | null;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
    lastErrorClass: ProviderFailureReason | null;
    circuitOpen: boolean;
  }>;
};

export type LlmRouterResult = {
  ok: boolean;
  provider: LlmProviderId;
  model: string;
  task: LlmTask;
  result: string;
  warnings: string[];
  usage: Record<string, unknown> | null;
  latency_ms: number;
};

export type EmbeddingResult = {
  ok: boolean;
  provider: LlmProviderId;
  model: string;
  embedding: number[] | null;
  warnings: string[];
  latency_ms: number;
};

type ProviderConfig = {
  id: Exclude<LlmProviderId, 'degraded'>;
  configured: boolean;
  apiKey?: string;
  baseUrl?: string;
  role: string;
  configuredBy: string[];
};

type ProviderCircuit = {
  blockedUntil: number;
  reason: ProviderFailureReason;
  failures: number;
};

type ModelTelemetry = {
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastCheckedAt: string | null;
  lastError: string | null;
  lastErrorClass: ProviderFailureReason | null;
  lastLatencyMs: number | null;
};

const providerCircuits = new Map<string, ProviderCircuit>();
const modelTelemetry = new Map<string, ModelTelemetry>();
const HARD_BLOCK_MS = 15 * 60_000;
const TRANSIENT_BLOCK_MS = 30_000;
const RATE_LIMIT_BLOCK_MS = 20_000;

function envModel(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? null;
}

const RAW_GEMINI_MODEL = envModel(process.env.GEMINI_MODEL, process.env.GOOGLE_MODEL);
const GEMINI_PRIMARY_MIGRATION = RAW_GEMINI_MODEL && /^gemini-1\.5(?:-|$)/i.test(RAW_GEMINI_MODEL)
  ? RAW_GEMINI_MODEL
  : null;

const DEFAULTS = {
  openai: envModel(process.env.OPENAI_MODEL) ?? 'gpt-4o-mini',
  anthropic: envModel(process.env.ANTHROPIC_MODEL, process.env.CLAUDE_MODEL) ?? 'claude-3-5-sonnet-latest',
  gemini: GEMINI_PRIMARY_MIGRATION ? 'gemini-3.7-flash' : RAW_GEMINI_MODEL ?? 'gemini-3.7-flash',
  geminiFast: envModel(process.env.GEMINI_FAST_MODEL) ?? 'gemini-3.5-flash-lite',
  groqFast: envModel(process.env.GROQ_MODEL, process.env.GROQ_FAST_MODEL) ?? 'openai/gpt-oss-20b',
  groqReasoning: envModel(process.env.GROQ_REASONING_MODEL) ?? 'openai/gpt-oss-120b',
  groqWeb: envModel(process.env.GROQ_WEB_MODEL) ?? 'groq/compound',
  groqWebFast: envModel(process.env.GROQ_WEB_FAST_MODEL) ?? 'groq/compound-mini',
  ollama: envModel(process.env.OLLAMA_MODEL) ?? 'llama3.1',
  huggingface: envModel(process.env.HUGGINGFACE_TEXT_MODEL, process.env.HF_TEXT_MODEL) ?? 'deepseek-ai/DeepSeek-V4-Flash-0731:preferred',
  openaiEmbedding: envModel(process.env.OPENAI_EMBEDDING_MODEL) ?? 'text-embedding-3-small',
  huggingfaceEmbedding: envModel(process.env.HUGGINGFACE_EMBEDDING_MODEL, process.env.HF_EMBEDDING_MODEL) ?? 'sentence-transformers/all-MiniLM-L6-v2',
  ollamaEmbedding: envModel(process.env.OLLAMA_EMBEDDING_MODEL) ?? 'nomic-embed-text',
};

function providerConfigs(): ProviderConfig[] {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const hfKey = process.env.HUGGINGFACE_API_KEY ?? process.env.HF_TOKEN ?? process.env.HF_API_TOKEN;
  const ollamaBase = process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST;

  return [
    { id: 'openai', configured: Boolean(openaiKey), apiKey: openaiKey, role: 'general hosted reasoning and embeddings', configuredBy: ['OPENAI_API_KEY', 'OPENAI_MODEL'] },
    { id: 'anthropic', configured: Boolean(anthropicKey), apiKey: anthropicKey, role: 'reasoning and long-context analysis', configuredBy: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_MODEL'] },
    { id: 'gemini', configured: Boolean(geminiKey), apiKey: geminiKey, role: 'long-context, multimodal and agentic analysis', configuredBy: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FAST_MODEL'] },
    { id: 'groq', configured: Boolean(groqKey), apiKey: groqKey, role: 'fast workers, open-weight reasoning and current-web compound systems', configuredBy: ['GROQ_API_KEY', 'GROQ_MODEL', 'GROQ_REASONING_MODEL', 'GROQ_WEB_MODEL', 'GROQ_WEB_FAST_MODEL'] },
    { id: 'ollama', configured: Boolean(ollamaBase), baseUrl: ollamaBase, role: 'local/private inference', configuredBy: ['OLLAMA_BASE_URL', 'OLLAMA_URL', 'OLLAMA_HOST', 'OLLAMA_MODEL'] },
    { id: 'huggingface', configured: Boolean(hfKey), apiKey: hfKey, role: 'Hugging Face Inference Providers router for open models plus HF inference embeddings', configuredBy: ['HUGGINGFACE_API_KEY', 'HF_TOKEN', 'HUGGINGFACE_TEXT_MODEL'] },
  ];
}

export function getLlmModelCatalog(): LlmModelCapability[] {
  return [
    { provider: 'openai', model: DEFAULTS.openai, role: 'general', contextTokens: null, reasoning: true, structuredOutput: true, web: false, multimodal: false, priority: 'balanced', configuredBy: ['OPENAI_MODEL'] },
    { provider: 'anthropic', model: DEFAULTS.anthropic, role: 'quality reasoning / long context', contextTokens: null, reasoning: true, structuredOutput: false, web: false, multimodal: false, priority: 'quality', configuredBy: ['ANTHROPIC_MODEL', 'CLAUDE_MODEL'] },
    { provider: 'gemini', model: DEFAULTS.gemini, role: 'quality multimodal / agentic / long context', contextTokens: 1_048_576, reasoning: true, structuredOutput: true, web: false, multimodal: true, priority: 'quality', configuredBy: ['GEMINI_MODEL', 'GOOGLE_MODEL'] },
    { provider: 'gemini', model: DEFAULTS.geminiFast, role: 'high-throughput worker', contextTokens: null, reasoning: false, structuredOutput: true, web: false, multimodal: true, priority: 'speed', configuredBy: ['GEMINI_FAST_MODEL'] },
    { provider: 'groq', model: DEFAULTS.groqFast, role: 'fast worker / classification / structured output', contextTokens: 131_072, reasoning: true, structuredOutput: true, web: false, multimodal: false, priority: 'speed', configuredBy: ['GROQ_MODEL', 'GROQ_FAST_MODEL'] },
    { provider: 'groq', model: DEFAULTS.groqReasoning, role: 'open-weight high-quality reasoning', contextTokens: 131_072, reasoning: true, structuredOutput: true, web: false, multimodal: false, priority: 'quality', configuredBy: ['GROQ_REASONING_MODEL'] },
    { provider: 'groq', model: DEFAULTS.groqWeb, role: 'current web research / multi-tool compound', contextTokens: 131_072, reasoning: true, structuredOutput: false, web: true, multimodal: false, priority: 'quality', configuredBy: ['GROQ_WEB_MODEL'] },
    { provider: 'groq', model: DEFAULTS.groqWebFast, role: 'current web research / low-latency compound', contextTokens: 131_072, reasoning: true, structuredOutput: false, web: true, multimodal: false, priority: 'speed', configuredBy: ['GROQ_WEB_FAST_MODEL'] },
    { provider: 'ollama', model: DEFAULTS.ollama, role: 'local/private model', contextTokens: null, reasoning: true, structuredOutput: false, web: false, multimodal: false, priority: 'balanced', configuredBy: ['OLLAMA_MODEL'] },
    { provider: 'huggingface', model: DEFAULTS.huggingface, role: 'experimental open-model route via Inference Providers', contextTokens: null, reasoning: true, structuredOutput: false, web: false, multimodal: false, priority: 'balanced', configuredBy: ['HUGGINGFACE_TEXT_MODEL', 'HF_TEXT_MODEL'] },
  ];
}

function routeKey(provider: LlmProviderId, model: string) {
  return `${provider}:${model}`;
}

function activeCircuit(provider: LlmProviderId, model: string) {
  const key = routeKey(provider, model);
  const circuit = providerCircuits.get(key);
  if (!circuit) return null;
  if (circuit.blockedUntil <= Date.now()) {
    providerCircuits.delete(key);
    return null;
  }
  return circuit;
}

function classifyProviderError(message: string): ProviderFailureReason {
  const lower = message.toLowerCase();
  if (/model.*not found|model.*not supported|unknown model|does not exist|retired|deprecated|\b404\b/.test(lower)) return 'model_invalid';
  if (/rate limit|too many requests|\b429\b|tpm|tokens per minute/.test(lower)) return 'rate_limit';
  if (/insufficient_quota|quota exceeded|current quota/.test(lower)) return 'quota';
  if (/credit balance|billing|purchase credits/.test(lower)) return 'billing';
  if (/invalid authentication|invalid credentials|invalid username|invalid password|unauthorized|\b401\b|\b403\b/.test(lower)) return 'auth';
  return 'transient';
}

function blockProvider(provider: LlmProviderId, model: string, message: string) {
  const reason = classifyProviderError(message);
  const key = routeKey(provider, model);
  const previous = providerCircuits.get(key);
  const duration = reason === 'rate_limit'
    ? RATE_LIMIT_BLOCK_MS
    : reason === 'transient'
      ? TRANSIENT_BLOCK_MS
      : HARD_BLOCK_MS;
  providerCircuits.set(key, { blockedUntil: Date.now() + duration, reason, failures: (previous?.failures ?? 0) + 1 });
  return reason;
}

function clearProviderCircuit(provider: LlmProviderId, model: string) {
  providerCircuits.delete(routeKey(provider, model));
}

function telemetryFor(provider: LlmProviderId, model: string): ModelTelemetry {
  return modelTelemetry.get(routeKey(provider, model)) ?? {
    lastSuccessAt: null,
    lastFailureAt: null,
    lastCheckedAt: null,
    lastError: null,
    lastErrorClass: null,
    lastLatencyMs: null,
  };
}

function markModelSuccess(provider: LlmProviderId, model: string, latencyMs: number) {
  const now = new Date().toISOString();
  modelTelemetry.set(routeKey(provider, model), {
    ...telemetryFor(provider, model),
    lastSuccessAt: now,
    lastCheckedAt: now,
    lastError: null,
    lastErrorClass: null,
    lastLatencyMs: latencyMs,
  });
  clearProviderCircuit(provider, model);
}

function markModelFailure(provider: LlmProviderId, model: string, message: string, latencyMs: number) {
  const now = new Date().toISOString();
  const reason = blockProvider(provider, model, message);
  modelTelemetry.set(routeKey(provider, model), {
    ...telemetryFor(provider, model),
    lastFailureAt: now,
    lastCheckedAt: now,
    lastError: message.slice(0, 320),
    lastErrorClass: reason,
    lastLatencyMs: latencyMs,
  });
  return reason;
}

function capabilityMatches(model: LlmModelCapability, requirements: LlmRequirements) {
  if (requirements.web && !model.web) return false;
  if (requirements.multimodal && !model.multimodal) return false;
  if (requirements.reasoning && !model.reasoning) return false;
  if (requirements.structuredOutput && !model.structuredOutput) return false;
  if (requirements.minContextTokens && model.contextTokens !== null && model.contextTokens < requirements.minContextTokens) return false;
  return true;
}

function requirementsForTask(task: LlmTask, explicit: LlmRequirements = {}): LlmRequirements {
  const base: LlmRequirements = task === 'web_research'
    ? { web: true, reasoning: true, priority: 'quality' }
    : task === 'fast_classification'
      ? { structuredOutput: true, priority: 'speed' }
      : task === 'draft'
        ? { priority: 'speed' }
        : task === 'context_long'
          ? { reasoning: true, minContextTokens: 100_000, priority: 'quality' }
          : ['deep_report', 'graph_interpretation', 'prediction', 'ifnorm', 'moph_reading'].includes(task)
            ? { reasoning: true, priority: 'quality' }
            : { reasoning: true, priority: 'balanced' };
  return { ...base, ...explicit };
}

function providerOrder(task: LlmTask, requirements: LlmRequirements): LlmProviderId[] {
  if (requirements.web || task === 'web_research') return ['groq'];
  if (task === 'fast_classification') return ['groq', 'gemini', 'openai', 'ollama', 'anthropic', 'huggingface'];
  if (task === 'context_long') return ['gemini', 'anthropic', 'groq', 'openai', 'huggingface', 'ollama'];
  if (task === 'draft') return ['groq', 'gemini', 'openai', 'anthropic', 'ollama', 'huggingface'];
  if (task === 'moph_reading') return ['groq', 'gemini', 'openai', 'anthropic', 'huggingface', 'ollama'];
  if (task === 'graph_interpretation') return ['groq', 'gemini', 'anthropic', 'openai', 'huggingface', 'ollama'];
  return ['groq', 'gemini', 'anthropic', 'openai', 'huggingface', 'ollama'];
}

function modelsForProvider(provider: Exclude<LlmProviderId, 'degraded'>, requirements: LlmRequirements) {
  const priority = requirements.priority ?? 'balanced';
  const catalog = getLlmModelCatalog().filter((item) => item.provider === provider && capabilityMatches(item, requirements));
  return catalog.sort((a, b) => {
    const rank = (item: LlmModelCapability) => item.priority === priority ? 0 : item.priority === 'balanced' ? 1 : 2;
    return rank(a) - rank(b);
  });
}

export function getLlmProviderStatus(): LlmProviderStatus[] {
  const configs = providerConfigs();
  const catalog = getLlmModelCatalog();
  return configs.map((config) => {
    const models = catalog.filter((item) => item.provider === config.id);
    const primary = models[0];
    const primaryTelemetry = primary ? telemetryFor(config.id, primary.model) : null;
    const primaryCircuit = primary ? activeCircuit(config.id, primary.model) : null;
    const anySuccess = models.map((item) => telemetryFor(config.id, item.model)).find((item) => Boolean(item.lastSuccessAt)) ?? null;
    const latestFailure = models
      .map((item) => telemetryFor(config.id, item.model))
      .filter((item) => item.lastFailureAt)
      .sort((a, b) => String(b.lastFailureAt).localeCompare(String(a.lastFailureAt)))[0] ?? null;
    const anyCircuit = models.map((item) => activeCircuit(config.id, item.model)).find(Boolean) ?? null;
    const lastSuccessAt = anySuccess?.lastSuccessAt ?? null;
    const lastFailureAt = latestFailure?.lastFailureAt ?? null;
    const canaryOk = lastSuccessAt
      ? (!lastFailureAt || lastSuccessAt >= lastFailureAt)
      : lastFailureAt ? false : null;
    const state: LlmProviderStatus['state'] = !config.configured
      ? 'UNCONFIGURED'
      : anyCircuit && !lastSuccessAt
        ? 'BLOCKED'
        : canaryOk === true
          ? anyCircuit ? 'DEGRADED' : 'HEALTHY'
          : canaryOk === false
            ? 'DEGRADED'
            : 'UNTESTED';
    return {
      id: config.id,
      available: config.configured && !primaryCircuit,
      configured: config.configured,
      credentialPresent: config.configured,
      model: primary?.model ?? 'unconfigured',
      role: config.role,
      configuredBy: config.configuredBy,
      state,
      canaryOk,
      lastSuccessAt,
      lastFailureAt,
      lastCheckedAt: [primaryTelemetry?.lastCheckedAt, latestFailure?.lastCheckedAt, anySuccess?.lastCheckedAt].filter(Boolean).sort().reverse()[0] ?? null,
      lastError: latestFailure?.lastError ?? null,
      lastErrorClass: latestFailure?.lastErrorClass ?? null,
      circuitOpen: Boolean(anyCircuit),
      circuitReason: anyCircuit?.reason ?? null,
      migratedModelFrom: config.id === 'gemini' ? GEMINI_PRIMARY_MIGRATION : null,
      models: models.map((item, index) => {
        const telemetry = telemetryFor(config.id, item.model);
        const circuit = activeCircuit(config.id, item.model);
        const modelCanary = telemetry.lastSuccessAt
          ? (!telemetry.lastFailureAt || telemetry.lastSuccessAt >= telemetry.lastFailureAt)
          : telemetry.lastFailureAt ? false : null;
        return {
          ...item,
          selected: index === 0,
          canaryOk: modelCanary,
          lastSuccessAt: telemetry.lastSuccessAt,
          lastFailureAt: telemetry.lastFailureAt,
          lastError: telemetry.lastError,
          lastErrorClass: telemetry.lastErrorClass,
          circuitOpen: Boolean(circuit),
        };
      }),
    };
  });
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const message = json && typeof json === 'object' && 'error' in json
        ? JSON.stringify((json as { error: unknown }).error).slice(0, 320)
        : `http_${response.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(config: ProviderConfig, model: string, input: {
  task: LlmTask;
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<{ result: string; usage: Record<string, unknown> | null }> {
  if (config.id === 'openai') {
    const json = await fetchJson('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }],
        temperature: 0.2,
        max_tokens: input.maxTokens,
      }),
    });
    const record = json as Record<string, unknown>;
    const choices = Array.isArray(record.choices) ? record.choices as Array<Record<string, unknown>> : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    return { result: typeof message?.content === 'string' ? message.content : '', usage: record.usage as Record<string, unknown> | null ?? null };
  }

  if (config.id === 'anthropic') {
    const json = await fetchJson('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': String(config.apiKey), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens,
        temperature: 0.2,
        system: input.system,
        messages: [{ role: 'user', content: input.prompt }],
      }),
    });
    const record = json as Record<string, unknown>;
    const content = Array.isArray(record.content) ? record.content as Array<Record<string, unknown>> : [];
    return { result: content.map((item) => typeof item.text === 'string' ? item.text : '').join('\n').trim(), usage: record.usage as Record<string, unknown> | null ?? null };
  }

  if (config.id === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(String(config.apiKey))}`;
    const generationConfig: Record<string, unknown> = { maxOutputTokens: input.maxTokens };
    // Gemini 3.7 migration guidance removes legacy sampling knobs such as temperature/top_p/top_k.
    if (!/^gemini-3\.7(?:-|$)/i.test(model)) generationConfig.temperature = 0.2;
    const json = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig,
      }),
    });
    const record = json as Record<string, unknown>;
    const candidates = Array.isArray(record.candidates) ? record.candidates as Array<Record<string, unknown>> : [];
    const content = candidates[0]?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts as Array<Record<string, unknown>> : [];
    return { result: parts.map((item) => typeof item.text === 'string' ? item.text : '').join('\n').trim(), usage: record.usageMetadata as Record<string, unknown> | null ?? null };
  }

  if (config.id === 'groq') {
    const isGptOss = model.startsWith('openai/gpt-oss-');
    const isCompound = model.startsWith('groq/compound');
    const json = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }],
        ...(!isCompound ? { temperature: 0.2 } : {}),
        max_completion_tokens: Math.min(input.maxTokens, isCompound ? 8192 : 65_536),
        ...(isGptOss ? { include_reasoning: false, reasoning_effort: input.task === 'fast_classification' ? 'low' : 'medium' } : {}),
      }),
    }, isCompound ? 30_000 : 15_000);
    const record = json as Record<string, unknown>;
    const choices = Array.isArray(record.choices) ? record.choices as Array<Record<string, unknown>> : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    return { result: typeof message?.content === 'string' ? message.content : '', usage: record.usage as Record<string, unknown> | null ?? null };
  }

  if (config.id === 'ollama') {
    const base = String(config.baseUrl).replace(/\/$/, '');
    const json = await fetchJson(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }] }),
    }, 18_000);
    const record = json as Record<string, unknown>;
    const message = record.message as Record<string, unknown> | undefined;
    return { result: typeof message?.content === 'string' ? message.content : '', usage: { eval_count: record.eval_count, prompt_eval_count: record.prompt_eval_count } };
  }

  if (config.id === 'huggingface') {
    const json = await fetchJson('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: input.system }, { role: 'user', content: input.prompt }],
        temperature: 0.2,
        max_tokens: input.maxTokens,
        stream: false,
      }),
    }, 25_000);
    const record = json as Record<string, unknown>;
    const choices = Array.isArray(record.choices) ? record.choices as Array<Record<string, unknown>> : [];
    const message = choices[0]?.message as Record<string, unknown> | undefined;
    return { result: typeof message?.content === 'string' ? message.content : '', usage: record.usage as Record<string, unknown> | null ?? null };
  }

  return { result: '', usage: null };
}

export async function runLlmTask(input: {
  task: LlmTask;
  system?: string;
  prompt: string;
  fallbackResult: string;
  preferredProvider?: LlmProviderId;
  requirements?: LlmRequirements;
  maxTokens?: number;
  maxProviderAttempts?: number;
}): Promise<LlmRouterResult> {
  const started = Date.now();
  const configs = providerConfigs();
  const warnings: string[] = [];
  if (GEMINI_PRIMARY_MIGRATION) warnings.push(`gemini_model_migrated:${GEMINI_PRIMARY_MIGRATION}->${DEFAULTS.gemini}`);
  const requirements = requirementsForTask(input.task, input.requirements);
  const baseOrder = providerOrder(input.task, requirements);
  const order = input.preferredProvider && input.preferredProvider !== 'degraded'
    ? [input.preferredProvider, ...baseOrder.filter((id) => id !== input.preferredProvider)]
    : baseOrder;
  const maxAttempts = Math.max(1, Math.min(10, input.maxProviderAttempts ?? 4));
  let attempts = 0;

  for (const providerId of order) {
    if (attempts >= maxAttempts || providerId === 'degraded') break;
    const config = configs.find((item) => item.id === providerId && item.configured);
    if (!config) continue;
    const models = modelsForProvider(config.id, requirements);
    if (!models.length) {
      warnings.push(`${providerId}_no_model_matches_requirements`);
      continue;
    }

    for (const candidate of models) {
      if (attempts >= maxAttempts) break;
      const circuit = activeCircuit(providerId, candidate.model);
      if (circuit) {
        warnings.push(`${providerId}:${candidate.model}_circuit_open:${circuit.reason}`);
        continue;
      }
      attempts += 1;
      const attemptStarted = Date.now();
      try {
        const output = await callProvider(config, candidate.model, {
          task: input.task,
          system: input.system ?? 'You are an SFI operational agent. Return concise, evidence-bound analysis. Do not claim external facts unless provided in context.',
          prompt: input.prompt,
          maxTokens: input.maxTokens ?? 700,
        });
        const latency = Date.now() - attemptStarted;
        if (output.result.trim()) {
          markModelSuccess(config.id, candidate.model, latency);
          return {
            ok: true,
            provider: config.id,
            model: candidate.model,
            task: input.task,
            result: output.result.trim(),
            warnings,
            usage: output.usage,
            latency_ms: Date.now() - started,
          };
        }
        const reason = markModelFailure(config.id, candidate.model, 'empty_result', latency);
        warnings.push(`${config.id}:${candidate.model}_empty_result:${reason}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        const reason = markModelFailure(config.id, candidate.model, message, Date.now() - attemptStarted);
        warnings.push(`${config.id}:${candidate.model}_failed:${reason}`);
      }
    }
  }

  return {
    ok: false,
    provider: 'degraded',
    model: 'unavailable',
    task: input.task,
    result: '',
    warnings: [...(warnings.length ? warnings : ['no_llm_provider_available']), 'synthetic_fallback_suppressed'],
    usage: null,
    latency_ms: Date.now() - started,
  };
}

export async function probeLlmProviders(input: { provider?: Exclude<LlmProviderId, 'degraded'>; includeAllModels?: boolean } = {}) {
  const configs = providerConfigs().filter((config) => config.configured && (!input.provider || config.id === input.provider));
  const catalog = getLlmModelCatalog();
  const results: Array<{ provider: string; model: string; ok: boolean; error: string | null }> = [];
  for (const config of configs) {
    const candidates = catalog.filter((item) => item.provider === config.id);
    const models = input.includeAllModels ? candidates : candidates.slice(0, 1);
    for (const candidate of models) {
      const started = Date.now();
      try {
        const output = await callProvider(config, candidate.model, {
          task: 'fast_classification',
          system: 'SFI provider canary. Return exactly OK.',
          prompt: 'OK',
          maxTokens: 8,
        });
        if (!output.result.trim()) throw new Error('empty_canary_result');
        markModelSuccess(config.id, candidate.model, Date.now() - started);
        results.push({ provider: config.id, model: candidate.model, ok: true, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        markModelFailure(config.id, candidate.model, message, Date.now() - started);
        results.push({ provider: config.id, model: candidate.model, ok: false, error: message.slice(0, 240) });
      }
    }
  }
  return { ok: results.length > 0 && results.every((item) => item.ok), checkedAt: new Date().toISOString(), results, providers: getLlmProviderStatus() };
}

function normalizeEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) return value as number[];
  if (Array.isArray(value) && Array.isArray(value[0])) {
    const rows = value.filter((row): row is number[] => Array.isArray(row) && row.every((item) => typeof item === 'number'));
    if (!rows.length) return null;
    const width = rows[0].length;
    return Array.from({ length: width }, (_, index) => rows.reduce((sum, row) => sum + (row[index] ?? 0), 0) / rows.length);
  }
  return null;
}

export async function createEmbedding(input: string): Promise<EmbeddingResult> {
  const started = Date.now();
  const configs = providerConfigs();
  const warnings: string[] = [];
  const openai = configs.find((item) => item.id === 'openai' && item.configured);
  if (openai && !activeCircuit('openai', DEFAULTS.openaiEmbedding)) {
    const attemptStarted = Date.now();
    try {
      const json = await fetchJson('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openai.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: DEFAULTS.openaiEmbedding, input }),
      }, 12_000);
      markModelSuccess('openai', DEFAULTS.openaiEmbedding, Date.now() - attemptStarted);
      const data = Array.isArray((json as Record<string, unknown>).data) ? (json as Record<string, unknown>).data as Array<Record<string, unknown>> : [];
      return { ok: true, provider: 'openai', model: DEFAULTS.openaiEmbedding, embedding: normalizeEmbedding(data[0]?.embedding), warnings, latency_ms: Date.now() - started };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      const reason = markModelFailure('openai', DEFAULTS.openaiEmbedding, message, Date.now() - attemptStarted);
      warnings.push(`openai_embedding_failed:${reason}`);
    }
  }

  const hf = configs.find((item) => item.id === 'huggingface' && item.configured);
  if (hf && !activeCircuit('huggingface', DEFAULTS.huggingfaceEmbedding)) {
    const attemptStarted = Date.now();
    try {
      const json = await fetchJson(`https://api-inference.huggingface.co/models/${DEFAULTS.huggingfaceEmbedding}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${hf.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: input }),
      }, 15_000);
      markModelSuccess('huggingface', DEFAULTS.huggingfaceEmbedding, Date.now() - attemptStarted);
      return { ok: true, provider: 'huggingface', model: DEFAULTS.huggingfaceEmbedding, embedding: normalizeEmbedding(json), warnings, latency_ms: Date.now() - started };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      const reason = markModelFailure('huggingface', DEFAULTS.huggingfaceEmbedding, message, Date.now() - attemptStarted);
      warnings.push(`huggingface_embedding_failed:${reason}`);
    }
  }

  const ollama = configs.find((item) => item.id === 'ollama' && item.configured);
  if (ollama && !activeCircuit('ollama', DEFAULTS.ollamaEmbedding)) {
    const attemptStarted = Date.now();
    try {
      const base = String(ollama.baseUrl).replace(/\/$/, '');
      const json = await fetchJson(`${base}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: DEFAULTS.ollamaEmbedding, prompt: input }),
      }, 12_000);
      markModelSuccess('ollama', DEFAULTS.ollamaEmbedding, Date.now() - attemptStarted);
      return { ok: true, provider: 'ollama', model: DEFAULTS.ollamaEmbedding, embedding: normalizeEmbedding((json as Record<string, unknown>).embedding), warnings, latency_ms: Date.now() - started };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      const reason = markModelFailure('ollama', DEFAULTS.ollamaEmbedding, message, Date.now() - attemptStarted);
      warnings.push(`ollama_embedding_failed:${reason}`);
    }
  }

  return { ok: false, provider: 'degraded', model: 'unavailable', embedding: null, warnings: warnings.length ? warnings : ['no_embedding_provider_available'], latency_ms: Date.now() - started };
}
