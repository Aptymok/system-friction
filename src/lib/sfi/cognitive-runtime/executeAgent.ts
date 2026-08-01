import { runtimeDispatcher } from "./runtimeDispatcher";
import type { KernelContext } from "./kernelContext";


export interface ExecuteAgentResult {

  ok: boolean;

  agentId: string;

  context: KernelContext;

  emittedEvent?: string;

  confidence?: number;

  error?: string;

}



export async function executeAgent(

  agentId: string,

  context: KernelContext

): Promise<ExecuteAgentResult> {



  const result =

    await runtimeDispatcher({

      agentId,

      input: context

    });



  if (!result.ok) {


    return {

      ok: false,

      agentId,

      context,

      error:

        result.error ?? "Agent execution failed"

    };


  }



  if (

    result.output &&

    typeof result.output === "object"

  ) {


    context.metadata = {


      ...context.metadata,


      [agentId]:

        result.output


    };


  }



  if (result.emittedEvent) {


    context.currentEvent =

      result.emittedEvent;


  }



  return {


    ok: true,

    agentId,

    context,

    emittedEvent:

      result.emittedEvent,

    confidence:

      result.confidence

  };

}