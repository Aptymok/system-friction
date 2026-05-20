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

export async function runAiTask(request: AiProviderRequest): Promise<AiProviderResponse> {
  const provider = resolveAiProvider(request.preferredProvider || process.env.DEFAULT_AI_PROVIDER as AiProvider | undefined);

  if (provider === 'local_stub') {
    return {
      ok: false,
      provider,
      task: request.task,
      text: 'Motor IA externo no configurado.',
      external: false,
      reason: 'missing_provider_key',
    };
  }

  return {
    ok: false,
    provider,
    task: request.task,
    text: 'Proveedor IA detectado, pero la ejecucion externa permanece deshabilitada en esta fase.',
    external: false,
    reason: 'external_execution_disabled',
  };
}
