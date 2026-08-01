import type { KernelContext, KernelEvidence, KernelSimulation } from "../kernelContext";


export interface SocialFieldState {

  populationSignal: number;

  trustSignal: number;

  interactionSignal: number;

  culturalSignal: number;

  stabilityIndex: number;

}


export function SocialFieldSimulatorAgent(
  context: KernelContext
): KernelContext {

  const evidence =
    context.evidence ?? [];


  const payloadText =
    evidence
      .map(
        item =>
          JSON.stringify(item.payload).toLowerCase()
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


  const state: SocialFieldState = {

    populationSignal:
      signal([
        "población",
        "grupo",
        "comunidad",
        "personas"
      ]),

    trustSignal:
      signal([
        "confianza",
        "legitimidad",
        "cooperación",
        "aceptación"
      ]),

    interactionSignal:
      signal([
        "interacción",
        "red",
        "relación",
        "comunicación"
      ]),

    culturalSignal:
      signal([
        "cultura",
        "símbolo",
        "narrativa",
        "valor"
      ]),

    stabilityIndex:
      0

  };


  state.stabilityIndex =
    (
      state.populationSignal +
      state.trustSignal +
      state.interactionSignal +
      state.culturalSignal
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "SocialFieldSimulatorAgent",

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
      "SocialFieldSimulatorAgent",

    confidence:
      state.stabilityIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    socialFieldSimulation: {

      executed:
        true,

      stabilityIndex:
        state.stabilityIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
