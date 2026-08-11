import type { KernelContext, KernelSimulation } from '../kernelContext';

export interface PolicyFieldState {
  governanceSignal: number;
  regulationSignal: number;
  institutionalSignal: number;
  accountabilitySignal: number;
  policyStabilityIndex: number;
}

export function PolicyFieldSimulatorAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const payloadText = evidence.map((item) => JSON.stringify(item.payload).toLowerCase()).join(' ');
  const signal = (terms: string[]) => Math.min(terms.filter((term) => payloadText.includes(term)).length / terms.length, 1);

  const state: PolicyFieldState = {
    governanceSignal: signal(['gobierno', 'gobernanza', 'decisión', 'autoridad']),
    regulationSignal: signal(['regulación', 'norma', 'ley', 'política']),
    institutionalSignal: signal(['institución', 'organización', 'estructura', 'administración']),
    accountabilitySignal: signal(['auditoría', 'transparencia', 'responsabilidad', 'control']),
    policyStabilityIndex: 0,
  };
  state.policyStabilityIndex = (state.governanceSignal + state.regulationSignal + state.institutionalSignal + state.accountabilitySignal) / 4;

  const simulation: KernelSimulation = {
    simulator: 'PolicyFieldSimulatorAgent',
    output: { ...state, epistemicClass: 'SIMULATED', evidenceRefs: evidence.map((item) => item.id) },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    policyFieldSimulation: {
      executed: true,
      policyIndex: state.policyStabilityIndex,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Policy simulation is not observed policy evidence and is not appended to context.evidence.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
