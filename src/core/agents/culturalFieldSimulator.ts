import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "@/core/contracts";


export interface CulturalFieldState {

  narrativeSignal: number;

  symbolSignal: number;

  attentionSignal: number;

  transmissionSignal: number;

  culturalPropagationIndex: number;

}


export function CulturalFieldSimulatorAgent(
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


  const state: CulturalFieldState = {

    narrativeSignal:
      signal([
        "narrativa",
        "historia",
        "relato",
        "discurso"
      ]),

    symbolSignal:
      signal([
        "símbolo",
        "significado",
        "identidad",
        "representación"
      ]),

    attentionSignal:
      signal([
        "atención",
        "tendencia",
        "visibilidad",
        "interés"
      ]),

    transmissionSignal:
      signal([
        "difusión",
        "comunicación",
        "red",
        "transmisión"
      ]),

    culturalPropagationIndex:
      0

  };


  state.culturalPropagationIndex =
    (
      state.narrativeSignal +
      state.symbolSignal +
      state.attentionSignal +
      state.transmissionSignal
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "CulturalFieldSimulatorAgent",

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
      "CulturalFieldSimulatorAgent",

    confidence:
      state.culturalPropagationIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    culturalFieldSimulation: {

      executed:
        true,

      culturalIndex:
        state.culturalPropagationIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
