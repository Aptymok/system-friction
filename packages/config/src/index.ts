export type RuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

export type AppConfigShape = {
  environment: RuntimeEnvironment;
  appName: string;
  publicBaseUrl?: string;
};

