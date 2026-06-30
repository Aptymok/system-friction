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
  | 'graph_interpretation';

export type LlmProviderId = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama' | 'huggingface' | 'degraded';

export type LlmProviderStatus = {
  id: LlmProviderId;
  available: boolean;
  model: string;
  role: string;
  configuredBy: string[];
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

type ProviderConfig = LlmProviderStatus & {
  apiKey?: string;
  baseUrl?: string;
};

const DEFAULTS = {
  openai: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  anthropic: process.env.ANTHROPIC_MODEL ?? process.env.CLAUDE_MODEL ?? 'claude-3-5-sonnet-latest',
  gemini: process.env.GEMINI_MODEL ?? process.env.GOOGLE_MODEL ?? 'gemini-1.5-flash',
  groq: process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant',
  ollama: process.env.OLLAMA_MODEL ?? 'llama3.1',
  huggingface: process.env.HUGGINGFACE_TEXT_MODEL ?? process.env.HF_TEXT_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.3',
  openaiEmbedding: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
  huggingfaceEmbedding: process.env.HUGGINGFACE_EMBEDDING_MODEL ?? process.env.HF_EMBEDDING_MODEL ?? 'sentence-transformers/all-MiniLM-L6-v2',
  ollamaEmbedding: process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
};

function providerConfigs(): ProviderConfig[] {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const hfKey = process.env.HUGGINGFACE_API_KEY ?? process.env.HF_TOKEN ?? process.env.HF_API_TOKEN;
  const ollamaBase = process.env.OLLAMA_BASE_URL ?? process.env.OLLAMA_URL ?? process.env.OLLAMA_HOST;

  return [
    {
      id: 'openai',
      available: Boolean(openaiKey),
      apiKey: openaiKey,
      model: DEFAULTS.openai,
      role: 'deep reasoning, IFNORM, reports, proposals, embeddings',
      configuredBy: ['OPENAI_API_KEY', 'OPENAI_MODEL'],
    },
    {
      id: 'anthropic',
      available: Boolean(anthropicKey),
      apiKey: anthropicKey,
      model: DEFAULTS.anthropic,
      role: 'deep reasoning, long context, reports',
      configuredBy: ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_MODEL'],
    },
    {
      id: 'gemini',
      available: Boolean(geminiKey),
      apiKey: geminiKey,
      model: DEFAULTS.gemini,
      role: 'long context, multimodal-ready analysis',
      configuredBy: ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_MODEL'],
    },
    {
      id: 'groq',
      available: Boolean(groqKey),
      apiKey: groqKey,
      model: DEFAULTS.groq,
      role: 'fast classification and drafts',
      configuredBy: ['GROQ_API_KEY', 'GROQ_MODEL'],
    },
    {
      id: 'ollama',
      available: Boolean(ollamaBase),
      baseUrl: ollamaBase,
      model: DEFAULTS.ollama,
      role: 'local/private fallback',
      configuredBy: ['OLLAMA_BASE_URL', 'OLLAMA_URL', 'OLLAMA_HOST', 'OLLAMA_MODEL'],
    },
    {
      id: 'huggingface',
      available: Boolean(hfKey),
      apiKey: hfKey,
      model: DEFAULTS.huggingface,
      role: 'specialized hosted inference and embeddings',
      configuredBy: ['HUGGINGFACE_API_KEY', 'HF_TOKEN', 'HUGGINGFACE_TEXT_MODEL'],
    },
  ];
}

export function getLlmProviderStatus(): LlmProviderStatus[] {
  return providerConfigs().map(({ id, available, model, role, configuredBy }) => ({
    id,
    available,
    model,
    role,
    configuredBy,
  }));
}

function providerOrder(task: LlmTask): LlmProviderId[] {
  if (task === 'fast_classification') return ['groq', 'openai', 'ollama', 'anthropic', 'gemini', 'huggingface'];
  if (task === 'context_long') return ['gemini', 'anthropic', 'openai', 'ollama', 'groq', 'huggingface'];
  if (task === 'draft') return ['groq', 'openai', 'anthropic', 'gemini', 'ollama', 'huggingface'];
  if (task === 'moph_reading') return ['openai', 'anthropic', 'gemini', 'groq', 'ollama', 'huggingface'];
  if (task === 'graph_interpretation') return ['anthropic', 'openai', 'gemini', 'groq', 'ollama', 'huggingface'];
  return ['anthropic', 'openai', 'gemini', 'groq', 'ollama', 'huggingface'];
}

async function fetchJson(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const message = json && typeof json === 'object' && 'error' in json
        ? JSON.stringify((json as { error: unknown }).error).slice(0, 240)
        : `http_${response.status}`;
      throw new Error(message);
    }
    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function callProvider(config: ProviderConfig, input: {
  task: LlmTask;
  system: string;
  prompt: string;
  maxTokens: number;
}): Promise<{ result: string; usage: Record<string, unknown> | null }> {
  if (config.id === 'openai') {
    const json = await fetchJson('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt },
        ],
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
      headers: {
        'x-api-key': String(config.apiKey),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(String(config.apiKey))}`;
    const json = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: input.maxTokens },
      }),
    });
    const record = json as Record<string, unknown>;
    const candidates = Array.isArray(record.candidates) ? record.candidates as Array<Record<string, unknown>> : [];
    const content = candidates[0]?.content as Record<string, unknown> | undefined;
    const parts = Array.isArray(content?.parts) ? content.parts as Array<Record<string, unknown>> : [];
    return { result: parts.map((item) => typeof item.text === 'string' ? item.text : '').join('\n').trim(), usage: record.usageMetadata as Record<string, unknown> | null ?? null };
  }

  if (config.id === 'groq') {
    const json = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt },
        ],
        temperature: 0.2,
        max_tokens: input.maxTokens,
      }),
    }, 12_000);
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
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.prompt },
        ],
      }),
    }, 18_000);
    const record = json as Record<string, unknown>;
    const message = record.message as Record<string, unknown> | undefined;
    return { result: typeof message?.content === 'string' ? message.content : '', usage: { eval_count: record.eval_count, prompt_eval_count: record.prompt_eval_count } };
  }

  if (config.id === 'huggingface') {
    const json = await fetchJson(`https://api-inference.huggingface.co/models/${config.model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `${input.system}\n\n${input.prompt}`,
        parameters: { max_new_tokens: input.maxTokens, temperature: 0.2, return_full_text: false },
      }),
    }, 20_000);
    const generated = Array.isArray(json)
      ? (json[0] as Record<string, unknown> | undefined)?.generated_text
      : (json as Record<string, unknown>).generated_text;
    return { result: typeof generated === 'string' ? generated : '', usage: null };
  }

  return { result: '', usage: null };
}

export async function runLlmTask(input: {
  task: LlmTask;
  system?: string;
  prompt: string;
  fallbackResult: string;
  preferredProvider?: LlmProviderId;
  maxTokens?: number;
}): Promise<LlmRouterResult> {
  const started = Date.now();
  const configs = providerConfigs();
  const warnings: string[] = [];
  const order = input.preferredProvider
    ? [input.preferredProvider, ...providerOrder(input.task).filter((id) => id !== input.preferredProvider)]
    : providerOrder(input.task);

  for (const providerId of order) {
    const config = configs.find((item) => item.id === providerId && item.available);
    if (!config) continue;
    try {
      const output = await callProvider(config, {
        task: input.task,
        system: input.system ?? 'You are an SFI operational agent. Return concise, evidence-bound analysis. Do not claim external facts unless provided in context.',
        prompt: input.prompt,
        maxTokens: input.maxTokens ?? 900,
      });
      if (output.result.trim()) {
        return {
          ok: true,
          provider: config.id,
          model: config.model,
          task: input.task,
          result: output.result.trim(),
          warnings,
          usage: output.usage,
          latency_ms: Date.now() - started,
        };
      }
      warnings.push(`${config.id}_empty_result`);
    } catch (error) {
      warnings.push(`${config.id}_failed:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  return {
    ok: false,
    provider: 'degraded',
    model: 'manual_fallback',
    task: input.task,
    result: input.fallbackResult,
    warnings: warnings.length ? warnings : ['no_llm_provider_available'],
    usage: null,
    latency_ms: Date.now() - started,
  };
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
  const openai = configs.find((item) => item.id === 'openai' && item.available);
  if (openai) {
    try {
      const json = await fetchJson('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: DEFAULTS.openaiEmbedding, input }),
      }, 12_000);
      const data = Array.isArray((json as Record<string, unknown>).data) ? (json as Record<string, unknown>).data as Array<Record<string, unknown>> : [];
      return {
        ok: true,
        provider: 'openai',
        model: DEFAULTS.openaiEmbedding,
        embedding: normalizeEmbedding(data[0]?.embedding),
        warnings,
        latency_ms: Date.now() - started,
      };
    } catch (error) {
      warnings.push(`openai_embedding_failed:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  const hf = configs.find((item) => item.id === 'huggingface' && item.available);
  if (hf) {
    try {
      const json = await fetchJson(`https://api-inference.huggingface.co/models/${DEFAULTS.huggingfaceEmbedding}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hf.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: input }),
      }, 15_000);
      return {
        ok: true,
        provider: 'huggingface',
        model: DEFAULTS.huggingfaceEmbedding,
        embedding: normalizeEmbedding(json),
        warnings,
        latency_ms: Date.now() - started,
      };
    } catch (error) {
      warnings.push(`huggingface_embedding_failed:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  const ollama = configs.find((item) => item.id === 'ollama' && item.available);
  if (ollama) {
    try {
      const base = String(ollama.baseUrl).replace(/\/$/, '');
      const json = await fetchJson(`${base}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: DEFAULTS.ollamaEmbedding, prompt: input }),
      }, 12_000);
      return {
        ok: true,
        provider: 'ollama',
        model: DEFAULTS.ollamaEmbedding,
        embedding: normalizeEmbedding((json as Record<string, unknown>).embedding),
        warnings,
        latency_ms: Date.now() - started,
      };
    } catch (error) {
      warnings.push(`ollama_embedding_failed:${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  return {
    ok: false,
    provider: 'degraded',
    model: 'textual_fallback',
    embedding: null,
    warnings: warnings.length ? warnings : ['no_embedding_provider_available'],
    latency_ms: Date.now() - started,
  };
}
