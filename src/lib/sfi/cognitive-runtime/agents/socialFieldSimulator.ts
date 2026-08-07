import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface SocialFieldState {
  populationSignal: number;
  trustSignal: number;
  interactionSignal: number;
  culturalSignal: number;
  stabilityIndex: number;
}

export function SocialFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');

  const signal = (terms: string[]): number => {
    const matches = terms.filter((term) => payloadText.includes(term)).length;
    return Math.min(matches / terms.length, 1);
  };

  const state: SocialFieldState = {
    populationSignal: signal(['población', 'grupo', 'comunidad', 'personas']),
    trustSignal: signal(['confianza', 'legitimidad', 'cooperación', 'aceptación']),
    interactionSignal: signal(['interacción', 'red', 'relación', 'comunicación']),
    culturalSignal: signal(['cultura', 'símbolo', 'narrativa', 'valor']),
    stabilityIndex: 0,
  };

  state.stabilityIndex = (state.populationSignal + state.trustSignal + state.interactionSignal + state.culturalSignal) / 4;

  const simulation: KernelSimulation = {
    simulator: 'SocialFieldSimulatorAgent',
    output: {
      ...state,
      epistemicClass: 'SIMULATED',
      evidenceRefs: evidence.map((item) => item.id),
    },
  };

  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    socialFieldSimulation: {
      executed: true,
      stabilityIndex: state.stabilityIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Simulation output is not observed evidence and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };

  return context;
}
