import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "@/core/contracts";


export interface FrictionFieldState {

  informationFriction: number;

  coordinationFriction: number;

  resourceFriction: number;

  temporalFriction: number;

  totalFrictionIndex: number;

}


export function FrictionFieldSimulatorAgent(
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


  const state: FrictionFieldState = {

    informationFriction:
      signal([
        "información",
        "dato",
        "evidencia",
        "conocimiento"
      ]),

    coordinationFriction:
      signal([
        "conflicto",
        "desalineación",
        "actor",
        "coordinación"
      ]),

    resourceFriction:
      signal([
        "recurso",
        "capacidad",
        "limitación",
        "presupuesto"
      ]),

    temporalFriction:
      signal([
        "tiempo",
        "retraso",
        "ventana",
        "cambio"
      ]),

    totalFrictionIndex:
      0

  };


  state.totalFrictionIndex =
    (
      state.informationFriction +
      state.coordinationFriction +
      state.resourceFriction +
      state.temporalFriction
    ) / 4;


  const simulation: KernelSimulation = {

    simulator:
      "FrictionFieldSimulatorAgent",

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
      "FrictionFieldSimulatorAgent",

    confidence:
      state.totalFrictionIndex,

    payload:
      state

  };


  context.evidence.push(
    evidenceOutput
  );


  context.metadata = {

    ...context.metadata,

    frictionFieldSimulation: {

      executed:
        true,

      frictionIndex:
        state.totalFrictionIndex,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
