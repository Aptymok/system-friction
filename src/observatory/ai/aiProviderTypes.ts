export type AiProvider = 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'local_stub';

export type AiTask = 'audit' | 'simulate' | 'explain' | 'route' | 'summarize';

export type AiProviderRequest = {
  task: AiTask;
  input: string;
  context?: Record<string, unknown>;
  preferredProvider?: AiProvider;
};

export type AiProviderResponse = {
  ok: boolean;
  provider: AiProvider;
  task: AiTask;
  text: string;
  external: boolean;
  reason?: string;
};

export type AiProviderConfig = {
  provider: AiProvider;
  hasKey: boolean;
  envKey?: string;
};
