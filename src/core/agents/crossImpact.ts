import type {
  KernelContext,
  KernelEvidence,
  KernelSimulation
} from "@/core/contracts";


export interface CrossImpactState {

  variableCount: number;

  interactionDensity: number;

  dominantSignals: string[];

  systemicCouplingIndex: number;

}


export function CrossImpactAgent(
  context: KernelContext
): KernelContext {

  const evidence =
    context.evidence ?? [];


  const simulations =
    context.simulations ?? [];


  const variables =
    new Set<string>();


  for (const item of evidence) {

    if (item.source) {
      variables.add(
        item.source
      );
    }

  }


  for (const simulation of simulations) {

    if (simulation.simulator) {
      variables.add(
        simulation.simulator
      );
    }

  }


  const variableCount =
    variables.size;


  const interactionPairs =
    variableCount > 1
      ? (variableCount * (variableCount - 1)) / 2
      : 0;


  const state: CrossImpactState = {

    variableCount,

    interactionDensity:
      Math.min(
        interactionPairs / 20,
        1
      ),

    dominantSignals:
      Array.from(
        variables
      ).slice(0, 5),

    systemicCouplingIndex:
      0

  };


  state.systemicCouplingIndex =
    (
      state.interactionDensity +
      Math.min(
        evidence.length / 20,
        1
      )
    ) / 2;


  const simulation: KernelSimulation = {

    simulator:
      "CrossImpactAgent",

    output:
      state

  };


  context.simulations.push(
    simulation
  );


  const impactEvidence: KernelEvidence = {

    id:
      crypto.randomUUID(),

    source:
      "CrossImpactAgent",

    confidence:
      state.systemicCouplingIndex,

    payload:
      state

  };


  context.evidence.push(
    impactEvidence
  );


  context.metadata = {

    ...context.metadata,

    crossImpact: {

      executed:
        true,

      couplingIndex:
        state.systemicCouplingIndex,

      variables:
        state.variableCount,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
