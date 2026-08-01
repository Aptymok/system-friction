import type {
  KernelContext
} from "./kernelContext";

import {
  executeRegisteredAgent
} from "./agentExecutionMap";

import {
  recordAgentExecutionEvent
} from "./runtimeEventBridge";


export interface AgentExecutionResult {

  agentId: string;

  executed: boolean;

  context: KernelContext;

  executedAt: string;

}



export async function runCognitiveAgent(
  agentId: string,
  context: KernelContext
): Promise<AgentExecutionResult> {



  const beforeEvidence =
    context.evidence.length;



  const beforeMetadataKeys =
    Object.keys(
      context.metadata ?? {}
    ).length;



  let updatedContext: KernelContext;

  let executed = false;



  try {


    updatedContext =
      executeRegisteredAgent(
        agentId,
        context
      );


    executed =
      Boolean(updatedContext);



  } catch (error) {


    updatedContext =
      context;


    executed =
      false;


  }



  const afterEvidence =
    updatedContext.evidence.length;



  const afterMetadataKeys =
    Object.keys(
      updatedContext.metadata ?? {}
    ).length;



  await recordAgentExecutionEvent(

    agentId,

    executed
      ? "SFI_AGENT_EXECUTED"
      : "SFI_AGENT_SKIPPED",

    {


      logbookId:

        updatedContext.logbookId,


      cycleId:

        updatedContext.cycleId,


      currentEvent:

        updatedContext.currentEvent,


      evidenceBefore:

        beforeEvidence,


      evidenceAfter:

        afterEvidence,


      metadataBefore:

        beforeMetadataKeys,


      metadataAfter:

        afterMetadataKeys,


      metadata:

        updatedContext.metadata


    }

  );



  return {


    agentId,


    executed,


    context:

      updatedContext,


    executedAt:

      new Date().toISOString()


  };

}