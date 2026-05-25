export type KernelRouteState = {
  path: string;
  exists: boolean;
  lastSeen: number;
  health: 'ok' | 'missing' | 'corrupt';
};

export type KernelState = {
  routes: Record<string, KernelRouteState>;
  tickVersion: number;
  lastRebuild: number;
};

const STATE_FILE = '.kernel-state.json';

const isProductionRuntime = () =>
  Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

const createDefaultState = (): KernelState => ({
  routes: {},
  tickVersion: 1,
  lastRebuild: Date.now(),
});

let memoryState: KernelState = createDefaultState();

function normalizeState(value: unknown): KernelState {
  if (!value || typeof value !== 'object') return memoryState;

  const candidate = value as Partial<KernelState>;
  return {
    routes:
      candidate.routes && typeof candidate.routes === 'object'
        ? candidate.routes
        : memoryState.routes,
    tickVersion:
      typeof candidate.tickVersion === 'number'
        ? candidate.tickVersion
        : memoryState.tickVersion,
    lastRebuild:
      typeof candidate.lastRebuild === 'number'
        ? candidate.lastRebuild
        : memoryState.lastRebuild,
  };
}

export async function getKernelState(): Promise<KernelState> {
  if (isProductionRuntime()) {
    return memoryState;
  }

  try {
    const fs = await import('fs/promises');
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    memoryState = normalizeState(JSON.parse(raw));
  } catch {
    memoryState = normalizeState(memoryState);
  }

  return memoryState;
}

export async function setKernelState(nextState: KernelState): Promise<KernelState> {
  memoryState = normalizeState(nextState);

  if (isProductionRuntime()) {
    return memoryState;
  }

  const fs = await import('fs/promises');
  await fs.writeFile(STATE_FILE, JSON.stringify(memoryState, null, 2), 'utf8');
  return memoryState;
}

export async function updateKernelState(
  updater: (state: KernelState) => KernelState,
): Promise<KernelState> {
  const current = await getKernelState();
  return setKernelState(updater(current));
}
