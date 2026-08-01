import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "../kernelContext";


export interface PolicyFieldState {

  governanceSignal: number;

  regulationSignal: number;

  institutionalSignal: number;

  accountabilitySignal: number;

  policyStabilityIndex: number;

}


export function PolicyFieldSimulatorAgent(
  context: KernelContext
): KernelContext {

  const evidence =
    context.evidence ?? [];


  const payloadText =
    evidence
      .map(
        item =>
          JSON.stringify(item.payload)
            .toLowerCase()
      )
      .join(" ");


  const signal = (
    terms: string[]
  ): number => {

    const matches =
      terms.filter(
        term =>
          payloadText.includes(term)
      ).length;


    return Math.min(
      matches / terms.length,
      1
    );

  };


  const state: PolicyFieldState = {

    governanceSignal:
      signal([
        "gobierno",
        "gobernanza",
        "decisión",
        "autoridad"
      ]),

    regulationSignal:
      signal([
        "regulación",
        "norma",
        "ley",
        "política"
      ]),

    institutionalSignal:
      signal([
        "institución",
        "organización",
        "estructura",
        "administración"
      ]),

    accountabilitySignal:
      signal([
        "auditoría",
        "transparencia",
        "responsabilidad",
        "control"
      ]),

    policyStabilityIndex:
      0

  };


  state.policyStabilityIndex =
    (
      state.governanceSignal +
      state.regulationSignal +
      state.institutionalSignal +
      state.accountabilitySignal
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "PolicyFieldSimulatorAgent",

    output:
      state

  };


  context.simulations.push(
    simulation
  );


  const evidenceOutput: KernelEvidence = {

    id:
      crypto.randomUUID(),

    source:
      "PolicyFieldSimulatorAgent",

    confidence:
      state.policyStabilityIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    policyFieldSimulation: {

      executed:
        true,

      policyIndex:
        state.policyStabilityIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
