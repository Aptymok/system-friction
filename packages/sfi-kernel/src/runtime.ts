import { cycle } from './cycle';
import type { SfiKernelAdapters, SfiKernelRuntimeState } from './state';

export function createSfiKernelRuntime(adapters: SfiKernelAdapters) {
  const state: SfiKernelRuntimeState = {
    running: false,
    lastCycleAt: null,
    lastResult: null,
    failures: 0,
  };

  return {
    state,
    async tick() {
      state.running = true;
      try {
        state.lastResult = await cycle(adapters);
        state.lastCycleAt = new Date().toISOString();
        return state.lastResult;
      } catch (error) {
        state.failures += 1;
        throw error;
      } finally {
        state.running = false;
      }
    },
  };
}
