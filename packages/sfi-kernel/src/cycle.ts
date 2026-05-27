import { mapWorldSpectToCampo } from '../../campo-ob/src';
import { computeDelta } from '../../delta/src';
import { evaluatePolicy } from '../../policy/src';
import type { SfiKernelAdapters, SfiKernelCycleResult } from './state';

export async function cycle(adapters: SfiKernelAdapters): Promise<SfiKernelCycleResult> {
  const worldSpect = await adapters.readWorldSpect();
  const campo = mapWorldSpectToCampo(worldSpect);
  const delta = computeDelta({
    confidence: campo.confidence,
    sourceState: campo.sourceState,
    nodes: campo.nodes,
  });
  const policy = evaluatePolicy({
    epistemicClass: campo.sourceState === 'missing' ? 'missing' : 'derived',
    confidence: campo.confidence,
    deltaScore: delta.score,
    hasSimulatedSources: campo.nodes.some((node) => node.simulated),
  });

  if (policy.allowed) {
    await adapters.appendEvent({
      eventName: 'sfi.kernel.cycle',
      epistemicClass: 'derived',
      confidence: campo.confidence,
      payload: { campo, delta, policy },
      occurredAt: campo.observedAt,
      logbookId: 'sfi-kernel',
    });
  }

  return {
    observedAt: campo.observedAt,
    campo,
    delta,
    policy,
    emitted: policy.allowed,
  };
}
