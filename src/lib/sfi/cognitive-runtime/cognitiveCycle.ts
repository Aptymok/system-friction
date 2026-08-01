import type {
  KernelContext
} from "./kernelContext";

import {
  runCognitiveAgent
} from "./runtimeAgentExecutor";


export interface CognitiveCycleResult {

  context: KernelContext;

  executedAgents: string[];

  completed: boolean;

}



export async function executeCognitiveCycle(
  context: KernelContext
): Promise<CognitiveCycleResult> {


  const executedAgents: string[] = [];


  let currentContext =
    context;



  const queue: string[] = [

    "meta_orchestrator"

  ];



  const processedAgents =
    new Set<string>();



  while (queue.length > 0) {


    const agentId =
      queue.shift()!;



    if (
      processedAgents.has(agentId)
    ) {

      continue;

    }



    processedAgents.add(agentId);



    const result =
      await runCognitiveAgent(

        agentId,

        currentContext

      );



    currentContext =
      result.context;



    if (
      result.executed
    ) {

      executedAgents.push(
        agentId
      );

    }



    const executionOrder =

      currentContext.metadata
        ?.cognitivePlan
        ?.executionOrder;



    if (
      Array.isArray(executionOrder)
    ) {


      for (
        const nextAgent
        of executionOrder
      ) {


        if (
          !processedAgents.has(nextAgent)
        ) {

          queue.push(nextAgent);

        }

      }

    }

  }



  /*
    Finalización del Task Graph

    MetaOrchestrator creó el grafo.
    El ciclo cognitivo lo consume.
    Aquí cambia el estado.
  */


  const taskGraph =
    currentContext.metadata
      ?.taskGraph;



  currentContext.metadata = {


    ...currentContext.metadata,


    taskGraph:


      taskGraph

        ? {

            ...taskGraph,

            status:
              "completed"

          }

        : undefined,



    taskGraphExecution: {


      status:
        "completed",


      executedAgents,


      completedAt:

        new Date().toISOString()


    },



    cognitiveCycle: {


      completed:

        true,


      executedAgents,


      finishedAt:

        new Date().toISOString()


    }


  };



  return {


    context:

      currentContext,


    executedAgents,


    completed:

      true

  };

}