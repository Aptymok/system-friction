import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface EconomicFieldState {
  capitalSignal: number;
  laborSignal: number;
  resourceSignal: number;
  marketSignal: number;
  economicPressureIndex: number;
}

export function EconomicFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);

  const state: EconomicFieldState = {
    capitalSignal: signal(['capital', 'inversión', 'financiamiento', 'recursos']),
    laborSignal: signal(['trabajo', 'empleo', 'talento', 'producción']),
    resourceSignal: signal(['materia', 'energía', 'infraestructura', 'capacidad']),
    marketSignal: signal(['mercado', 'demanda', 'consumo', 'precio']),
    economicPressureIndex: 0,
  };
  state.economicPressureIndex = (state.capitalSignal + state.laborSignal + state.resourceSignal + state.marketSignal) / 4;

  const simulation: KernelSimulation = {
    simulator: 'EconomicFieldSimulatorAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    economicFieldSimulation: {
      executed: true,
      economicIndex: state.economicPressureIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Simulation output is not observed evidence and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
