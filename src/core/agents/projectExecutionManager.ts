import type {
  KernelContext,
  KernelEvidence
} from "@/core/contracts";


export interface ProjectExecutionState {

  activeTasks: number;

  blockedTasks: number;

  dependencyCount: number;

  executionReadiness: number;

  governanceRequired: boolean;

}


export function ProjectExecutionManagerAgent(
  context: KernelContext
): KernelContext {

  const metadata =
    context.metadata ?? {};


  const risks =
    context.risks ?? [];


  const opportunities =
    context.opportunities ?? [];


  const simulations =
    context.simulations ?? [];


  const activeTasks =
    Number(
      metadata.activeTasks ?? 0
    );


  const blockedTasks =
    risks.length;


  const dependencyCount =
    simulations.length;


  const readiness =
    Math.max(
      0,
      Math.min(
        1,
        (
          opportunities.length +
          simulations.length
        )
        /
        (
          risks.length +
          opportunities.length +
          simulations.length +
          1
        )
      )
    );


  const state: ProjectExecutionState = {

    activeTasks,

    blockedTasks,

    dependencyCount,

    executionReadiness:
      readiness,

    governanceRequired:
      risks.some(
        risk =>
          risk.severity > 0.5
      )

  };


  const evidence: KernelEvidence = {

    id:
      crypto.randomUUID(),

    source:
      "ProjectExecutionManagerAgent",

    confidence:
      state.executionReadiness,

    payload:
      state

  };


  context.evidence.push(
    evidence
  );


  context.metadata = {

    ...context.metadata,

    projectExecutionManager: {

      executed:
        true,

      executionReadiness:
        state.executionReadiness,

      blockedTasks:
        state.blockedTasks,

      governanceRequired:
        state.governanceRequired,

      executedAt:
        new Date().toISOString()

    }

  };


  return context;

}
