import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface CulturalFieldState {
  narrativeSignal: number;
  symbolSignal: number;
  attentionSignal: number;
  transmissionSignal: number;
  culturalPropagationIndex: number;
}

export function CulturalFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);

  const state: CulturalFieldState = {
    narrativeSignal: signal(['narrativa', 'historia', 'relato', 'discurso']),
    symbolSignal: signal(['símbolo', 'significado', 'identidad', 'representación']),
    attentionSignal: signal(['atención', 'tendencia', 'visibilidad', 'interés']),
    transmissionSignal: signal(['difusión', 'comunicación', 'red', 'transmisión']),
    culturalPropagationIndex: 0,
  };
  state.culturalPropagationIndex = (state.narrativeSignal + state.symbolSignal + state.attentionSignal + state.transmissionSignal) / 4;

  const simulation: KernelSimulation = {
    simulator: 'CulturalFieldSimulatorAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    culturalFieldSimulation: {
      executed: true,
      culturalIndex: state.culturalPropagationIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Cultural simulation is not observed cultural evidence and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
