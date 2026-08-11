import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface EntropyRedistributionState {
  evidenceEntropy: number;
  coordinationEntropy: number;
  memoryEntropy: number;
  unresolvedEntropy: number;
  redistributionIndex: number;
}

export function EntropyRedistributionAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const contradictions = context.contradictions ?? [];
  const hypotheses = context.hypotheses ?? [];
  const normalize = (value: number, max: number) => max === 0 ? 0 : Math.min(value / max, 1);

  const state: EntropyRedistributionState = {
    evidenceEntropy: normalize(evidence.filter((item) => item.confidence < 0.5).length, Math.max(evidence.length, 1)),
    coordinationEntropy: normalize(contradictions.length, Math.max(evidence.length, 1)),
    memoryEntropy: normalize(Object.keys(context.metadata ?? {}).length, 20),
    unresolvedEntropy: normalize(hypotheses.filter((item) => item.confidence < 0.5).length, Math.max(hypotheses.length, 1)),
    redistributionIndex: 0,
  };
  state.redistributionIndex = (state.evidenceEntropy + state.coordinationEntropy + state.memoryEntropy + state.unresolvedEntropy) / 4;

  const simulation: KernelSimulation = {
    simulator: 'EntropyRedistributionAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    entropyRedistribution: {
      executed: true,
      entropyIndex: state.redistributionIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Entropy redistribution is a derived simulation and is not appended to observed evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
