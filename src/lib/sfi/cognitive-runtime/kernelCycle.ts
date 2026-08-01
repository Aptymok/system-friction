import { EVENT_GRAPH } from "./eventGraph";
import { createKernelContext } from "./createKernelContext";
import { executeAgent } from "./executeAgent";
import type { KernelContext } from "./kernelContext";


export interface KernelCycleRequest {

  cycleId: string;

  logbookId: string;

  initialEvent: string;

}


export interface KernelCycleResult {

  context: KernelContext;

  executedAgents: string[];

  skippedAgents: string[];

  emittedEvents: string[];

}



export async function runKernelCycle(
  request: KernelCycleRequest
): Promise<KernelCycleResult> {


  const context = createKernelContext(

    request.cycleId,

    request.logbookId,

    request.initialEvent

  );



  const executedAgents: string[] = [];

  const skippedAgents: string[] = [];

  const emittedEvents: string[] = [];



  const queue: string[] = [

    request.initialEvent

  ];



  const visitedEvents = new Set<string>();



  while (queue.length > 0) {


    const currentEvent =
      queue.shift()!;



    if (visitedEvents.has(currentEvent)) {

      continue;

    }



    visitedEvents.add(currentEvent);



    context.currentEvent =
      currentEvent;



    const agents =

      EVENT_GRAPH[
        currentEvent as keyof typeof EVENT_GRAPH
      ] ?? [];



    for (const agentId of agents) {


      const previousEvent =
        context.currentEvent;



      const result =
        await executeAgent(

          agentId,

          context

        );



      if (result) {

        executedAgents.push(
          agentId
        );

      } else {

        skippedAgents.push(
          agentId
        );

      }



      if (

        context.currentEvent !== previousEvent

      ) {


        emittedEvents.push(

          context.currentEvent

        );



        queue.push(

          context.currentEvent

        );


      }


    }

  }



  context.metadata = {


    ...context.metadata,


    kernelCycle: {


      executedAgents,


      skippedAgents,


      emittedEvents,


      completedAt:

        new Date().toISOString()


    }


  };



  return {


    context,


    executedAgents,


    skippedAgents,


    emittedEvents


  };

}