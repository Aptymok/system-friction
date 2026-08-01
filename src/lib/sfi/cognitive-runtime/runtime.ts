import type {
  SfiCognitiveRuntimeSnapshot
} from "./types";

import type {
  KernelContext
} from "./kernelContext";

import {
  executeCognitiveCycle
} from "./cognitiveCycle";

import {
  recordCognitiveCycleEvent
} from "./runtimeEventBridge";


export async function executeSfiRuntime(
  context: KernelContext
) {

  const result =
    await executeCognitiveCycle(
      context
    );

await recordCognitiveCycleEvent({

  cycleId: context.cycleId,

  logbookId: context.logbookId,

  taskId: context.taskId,

  phenomenonId: context.phenomenonId,

  executedAgents: result.executedAgents

});

  return result;

}


export function publishCognitiveTaskGraph(
  graph: any
) {

  return {

    ok: true,

    published: true,

    taskGraph: graph,

    graph,

    logbookId:
      graph?.logbookId ??
      crypto.randomUUID(),

    error: null,

    details: null,

    event: {

      type:
        "SFI_TASK_GRAPH_PUBLISHED",

      timestamp:
        new Date().toISOString()

    }

  };

}

export function readSfiCognitiveRuntime(): SfiCognitiveRuntimeSnapshot {
  return {
    generatedAt:
      new Date().toISOString(),

    schemaVersion:
      "1.0",

    status:
      "operational",

    summary:
      "Cognitive runtime active",

    contract: {
      registeredAgents: 0,
      operationalModes: 0,
      executorAgents: 0,
      humanApprovalAgents: 0,
    },

    eventGraph: {
      source:
        "sfi_cognitive_runtime",

      status:
        "operational",

      recentEvents: [],

      warnings: [],
    },

    layers: [],

    agents: [],

    modes: [],

    orchestrationPolicy: {
      principle:
        "Governed cognitive execution",

      taskCreatedEvent:
        "SFI_TASK_CREATED",

      executionRule:
        "Human approval required for governed actions",

      memoryRule:
        "Persist epistemic state",

      simulationRule:
        "Simulation does not mutate reality",

      calibrationRule:
        "Validate projections against returned evidence",
    },
  };
}

