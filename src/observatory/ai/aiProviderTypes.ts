export type AiProvider = 'openai' | 'anthropic' | 'deepseek' | 'groq' | 'local_stub';

export type AiTask = 'summarize' | 'audit' | 'simulate' | 'explain' | 'route' | 'rewrite_blocked';

export type AiProviderRequest = {
  task: AiTask;
  input: string;
  context?: Record<string, unknown>;
  mode?: string;
  providerPreference?: AiProvider;
  preferredProvider?: AiProvider;
};

export type AiProviderResponse = {
  ok: boolean;
  provider: AiProvider;
  task: AiTask;
  output: string;
  text: string;
  external: boolean;
  usage?: Record<string, unknown>;
  error?: string;
  reason?: string;
};

export type AiProviderConfig = {
  provider: AiProvider;
  hasKey: boolean;
  envKey?: string;
};
