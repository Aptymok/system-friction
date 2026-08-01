import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "@/core/contracts";


export interface StakeholderDivergenceState {

  operatorAlignment: number;

  participantAlignment: number;

  systemAlignment: number;

  divergenceIndex: number;

  governanceRisk: number;

}


export function MultiStakeholderBootstrapAgent(
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


  const operatorAlignment =
    signal([
      "operador",
      "ejecución",
      "decisión",
      "control"
    ]);


  const participantAlignment =
    signal([
      "participante",
      "usuario",
      "comunidad",
      "aceptación"
    ]);


  const systemAlignment =
    signal([
      "sistema",
      "arquitectura",
      "proceso",
      "estructura"
    ]);


  const divergence =
    Math.abs(
      operatorAlignment -
      participantAlignment
    ) +
    Math.abs(
      participantAlignment -
      systemAlignment
    ) +
    Math.abs(
      operatorAlignment -
      systemAlignment
    );


  const state: StakeholderDivergenceState = {

    operatorAlignment,

    participantAlignment,

    systemAlignment,

    divergenceIndex:
      Math.min(
        divergence / 3,
        1
      ),

    governanceRisk:
      Math.min(
        divergence / 3,
        1
      )

  };


  const simulation: KernelSimulation = {

    simulator:
      "MultiStakeholderBootstrapAgent",

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
      "MultiStakeholderBootstrapAgent",

    confidence:
      1 - state.divergenceIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    multiStakeholderBootstrap: {

      executed:
        true,

      divergenceIndex:
        state.divergenceIndex,

      governanceRisk:
        state.governanceRisk,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
