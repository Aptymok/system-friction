import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface StakeholderDivergenceState {
  operatorAlignment: number;
  participantAlignment: number;
  systemAlignment: number;
  divergenceIndex: number;
  governanceRisk: number;
}

export function MultiStakeholderBootstrapAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);
  const operatorAlignment = signal(['operador', 'ejecución', 'decisión', 'control']);
  const participantAlignment = signal(['participante', 'usuario', 'comunidad', 'aceptación']);
  const systemAlignment = signal(['sistema', 'arquitectura', 'proceso', 'estructura']);
  const divergence = Math.abs(operatorAlignment - participantAlignment) + Math.abs(participantAlignment - systemAlignment) + Math.abs(operatorAlignment - systemAlignment);

  const state: StakeholderDivergenceState = {
    operatorAlignment,
    participantAlignment,
    systemAlignment,
    divergenceIndex: Math.min(divergence / 3, 1),
    governanceRisk: Math.min(divergence / 3, 1),
  };
  const simulation: KernelSimulation = {
    simulator: 'MultiStakeholderBootstrapAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    multiStakeholderBootstrap: {
      executed: true,
      divergenceIndex: state.divergenceIndex,
      governanceRisk: state.governanceRisk,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Stakeholder divergence is simulated from available traces and is not appended to observed evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
