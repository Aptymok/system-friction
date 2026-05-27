import { createSfiKernelRuntime } from './runtime';
import type { SfiKernelAdapters } from './state';

export function bootstrapSfiKernel(adapters: SfiKernelAdapters) {
  return createSfiKernelRuntime(adapters);
}
