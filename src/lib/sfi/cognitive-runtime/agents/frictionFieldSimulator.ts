import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface FrictionFieldState {
  informationFriction: number;
  coordinationFriction: number;
  resourceFriction: number;
  temporalFriction: number;
  totalFrictionIndex: number;
}

export function FrictionFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);

  const state: FrictionFieldState = {
    informationFriction: signal(['información', 'dato', 'evidencia', 'conocimiento']),
    coordinationFriction: signal(['conflicto', 'desalineación', 'actor', 'coordinación']),
    resourceFriction: signal(['recurso', 'capacidad', 'limitación', 'presupuesto']),
    temporalFriction: signal(['tiempo', 'retraso', 'ventana', 'cambio']),
    totalFrictionIndex: 0,
  };
  state.totalFrictionIndex = (state.informationFriction + state.coordinationFriction + state.resourceFriction + state.temporalFriction) / 4;

  const simulation: KernelSimulation = {
    simulator: 'FrictionFieldSimulatorAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    frictionFieldSimulation: {
      executed: true,
      frictionIndex: state.totalFrictionIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Simulation output is not observed evidence and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
