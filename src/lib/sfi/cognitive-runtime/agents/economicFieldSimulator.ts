import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "../kernelContext";


export interface EconomicFieldState {

  capitalSignal: number;

  laborSignal: number;

  resourceSignal: number;

  marketSignal: number;

  economicPressureIndex: number;

}


export function EconomicFieldSimulatorAgent(
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


  const state: EconomicFieldState = {

    capitalSignal:
      signal([
        "capital",
        "inversión",
        "financiamiento",
        "recursos"
      ]),

    laborSignal:
      signal([
        "trabajo",
        "empleo",
        "talento",
        "producción"
      ]),

    resourceSignal:
      signal([
        "materia",
        "energía",
        "infraestructura",
        "capacidad"
      ]),

    marketSignal:
      signal([
        "mercado",
        "demanda",
        "consumo",
        "precio"
      ]),

    economicPressureIndex:
      0

  };


  state.economicPressureIndex =
    (
      state.capitalSignal +
      state.laborSignal +
      state.resourceSignal +
      state.marketSignal
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "EconomicFieldSimulatorAgent",

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
      "EconomicFieldSimulatorAgent",

    confidence:
      state.economicPressureIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    economicFieldSimulation: {

      executed:
        true,

      economicIndex:
        state.economicPressureIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
