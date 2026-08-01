import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "../kernelContext";


export interface PsychologicalFieldState {

  desireSignal: number;

  fearSignal: number;

  memorySignal: number;

  rewardSignal: number;

  psychologicalTensionIndex: number;

}


export function PsychologicalFieldSimulatorAgent(
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


  const state: PsychologicalFieldState = {

    desireSignal:
      signal([
        "deseo",
        "objetivo",
        "aspiración",
        "motivación"
      ]),

    fearSignal:
      signal([
        "miedo",
        "riesgo",
        "amenaza",
        "pérdida"
      ]),

    memorySignal:
      signal([
        "memoria",
        "experiencia",
        "historia",
        "aprendizaje"
      ]),

    rewardSignal:
      signal([
        "beneficio",
        "recompensa",
        "valor",
        "resultado"
      ]),

    psychologicalTensionIndex:
      0

  };


  state.psychologicalTensionIndex =
    (
      state.desireSignal +
      state.fearSignal +
      state.memorySignal +
      state.rewardSignal
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "PsychologicalFieldSimulatorAgent",

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
      "PsychologicalFieldSimulatorAgent",

    confidence:
      state.psychologicalTensionIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    psychologicalFieldSimulation: {

      executed:
        true,

      psychologicalIndex:
        state.psychologicalTensionIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
