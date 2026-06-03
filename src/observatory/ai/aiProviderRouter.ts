import type { AiProvider, AiProviderConfig, AiProviderRequest, AiProviderResponse } from './aiProviderTypes';

const providerEnv: Record<Exclude<AiProvider, 'local_stub'>, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  groq: 'GROQ_API_KEY',
};

const providerOrder: AiProvider[] = ['openai', 'anthropic', 'deepseek', 'groq', 'local_stub'];

export function getAiProviderConfigs(): AiProviderConfig[] {
  return providerOrder.map((provider) => {
    if (provider === 'local_stub') return { provider, hasKey: true };
    const envKey = providerEnv[provider];
    return { provider, envKey, hasKey: Boolean(process.env[envKey]) };
  });
}

export function resolveAiProvider(preferredProvider?: AiProvider): AiProvider {
  if (preferredProvider && preferredProvider !== 'local_stub') {
    const envKey = providerEnv[preferredProvider];
    if (process.env[envKey]) return preferredProvider;
  }
  const configured = getAiProviderConfigs().find((config) => config.provider !== 'local_stub' && config.hasKey);
  return configured?.provider || 'local_stub';
}

function stringifyContext(context?: Record<string, unknown>) {
  if (!context) return '';
  return JSON.stringify(context, null, 2).slice(0, 24000);
}

function systemInstruction(request: AiProviderRequest) {
  const context = stringifyContext(request.context);
  return [
    'Responde en español claro, directo y útil.',
    request.mode === 'sfi_visor_companion'
      ? 'Actúa como VISOR ROOT, interlocutor operativo de SystemFriction Institute. No ejecutes acciones, no crees registros, no inventes evidencia y separa registro, inferencia, hipótesis y conocimiento general.'
      : `Tarea: ${request.task}.`,
    context ? `Contexto visible:\n${context}` : '',
  ].filter(Boolean).join('\n\n');
}

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const message = typeof payload?.error === 'object' && payload.error && 'message' in payload.error
      ? String((payload.error as { message?: unknown }).message)
      : `provider_http_${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function callOpenAi(request: AiProviderRequest, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemInstruction(request) },
        { role: 'user', content: request.input },
      ],
      temperature: 0.4,
    }),
  });
  const payload = await parseJsonResponse(response);
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] as Record<string, unknown> | undefined : undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  return {
    text: typeof message?.content === 'string' ? message.content : '',
    usage: typeof payload?.usage === 'object' && payload.usage ? payload.usage as Record<string, unknown> : undefined,
  };
}

async function callAnthropic(request: AiProviderRequest, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 1200,
      system: systemInstruction(request),
      messages: [{ role: 'user', content: request.input }],
    }),
  });
  const payload = await parseJsonResponse(response);
  const content = Array.isArray(payload?.content) ? payload.content : [];
  const text = content.map((item) => {
    if (item && typeof item === 'object' && 'text' in item) return String((item as { text?: unknown }).text || '');
    return '';
  }).filter(Boolean).join('\n');
  return {
    text,
    usage: typeof payload?.usage === 'object' && payload.usage ? payload.usage as Record<string, unknown> : undefined,
  };
}

async function callGroqCompatible(request: AiProviderRequest, apiKey: string, provider: 'groq' | 'deepseek') {
  const endpoint = provider === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
  const model = provider === 'groq'
    ? process.env.GROQ_MODEL || 'llama-3.1-8b-instant'
    : process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction(request) },
        { role: 'user', content: request.input },
      ],
      temperature: 0.35,
    }),
  });
  const payload = await parseJsonResponse(response);
  const choice = Array.isArray(payload?.choices) ? payload.choices[0] as Record<string, unknown> | undefined : undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  return {
    text: typeof message?.content === 'string' ? message.content : '',
    usage: typeof payload?.usage === 'object' && payload.usage ? payload.usage as Record<string, unknown> : undefined,
  };
}

export async function runAiTask(request: AiProviderRequest): Promise<AiProviderResponse> {
  const provider = resolveAiProvider(request.providerPreference || request.preferredProvider || process.env.DEFAULT_AI_PROVIDER as AiProvider | undefined);

  if (provider === 'local_stub') {
    const output = request.mode === 'sfi_visor_companion'
      ? 'VISOR sin proveedor externo configurado; usar fallback local.'
      : 'Motor IA externo no configurado.';
    return {
      ok: false,
      provider,
      task: request.task,
      output,
      text: output,
      external: false,
      reason: 'missing_provider_key',
      error: 'missing_provider_key',
    };
  }

  const apiKey = process.env[providerEnv[provider]];
  if (!apiKey) {
    return {
      ok: false,
      provider: 'local_stub',
      task: request.task,
      output: 'Motor IA externo no configurado.',
      text: 'Motor IA externo no configurado.',
      external: false,
      reason: 'missing_provider_key',
      error: 'missing_provider_key',
    };
  }

  try {
    const result = provider === 'openai'
      ? await callOpenAi(request, apiKey)
      : provider === 'anthropic'
        ? await callAnthropic(request, apiKey)
        : await callGroqCompatible(request, apiKey, provider);
    const output = result.text.trim();
    if (!output) throw new Error('empty_provider_response');
    return {
      ok: true,
      provider,
      task: request.task,
      output,
      text: output,
      external: true,
      usage: result.usage,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'provider_request_failed';
    return {
      ok: false,
      provider,
      task: request.task,
      output: message,
      text: message,
      external: true,
      reason: 'provider_request_failed',
      error: message,
    };
  }
}
