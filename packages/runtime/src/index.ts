export type RuntimeHealth = {
  status: 'idle' | 'running' | 'degraded';
  lastCycleAt: string | null;
  failures: number;
};

export function runtimeHealth(input: { running: boolean; lastCycleAt: string | null; failures: number }): RuntimeHealth {
  return {
    status: input.failures > 0 ? 'degraded' : input.running ? 'running' : 'idle',
    lastCycleAt: input.lastCycleAt,
    failures: input.failures,
  };
}
