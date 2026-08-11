import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface PsychologicalFieldState {
  desireSignal: number;
  fearSignal: number;
  memorySignal: number;
  rewardSignal: number;
  psychologicalTensionIndex: number;
}

export function PsychologicalFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);

  const state: PsychologicalFieldState = {
    desireSignal: signal(['deseo', 'objetivo', 'aspiración', 'motivación']),
    fearSignal: signal(['miedo', 'riesgo', 'amenaza', 'pérdida']),
    memorySignal: signal(['memoria', 'experiencia', 'historia', 'aprendizaje']),
    rewardSignal: signal(['beneficio', 'recompensa', 'valor', 'resultado']),
    psychologicalTensionIndex: 0,
  };
  state.psychologicalTensionIndex = (state.desireSignal + state.fearSignal + state.memorySignal + state.rewardSignal) / 4;

  const simulation: KernelSimulation = {
    simulator: 'PsychologicalFieldSimulatorAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    psychologicalFieldSimulation: {
      executed: true,
      psychologicalIndex: state.psychologicalTensionIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Psychological simulation is not a diagnosis or observed private mental state and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
