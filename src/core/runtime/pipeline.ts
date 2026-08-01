import { randomUUID } from "crypto";

import {
  calculateFS,
  calculatePhiSfi,
  resolveRegime
} from "@/core/formulas/canonicalFormulas";

import { canonicalAgents } from "@/core/agents";

import { InMemoryEventBus } from "@/core/runtime";

import type {
  KernelContext,
  SfiTraceContext
} from "@/core/contracts";


export interface PipelineExecutionResult {

  id: string;

  trace: SfiTraceContext;

  regime: string;

  status: "COMPLETED" | "FAILED";

  agentResults: Array<{
    agentId: string;
    status: string;
    confidence: number;
  }>;

  evidence: string[];

}



export class CanonicalPipelineRunner {


  private readonly eventBus =
    new InMemoryEventBus();



  async run(
    input: {
      capabilityId: string;
      actorId: string;
      payload: unknown;
    }

  ): Promise<PipelineExecutionResult> {



    const trace: SfiTraceContext = {

      logbookId:
        `pipeline-${randomUUID()}`,

      correlationId:
        randomUUID(),

      initiatedBy:
        input.actorId,

      createdAt:
        new Date().toISOString()

    };




    const phiSfi =
      calculatePhiSfi(
        0.62,
        0.71,
        0.24,
        0.05
      );



    const fS =
      calculateFS(phiSfi);



    const regime =
      resolveRegime(phiSfi);




    const context: KernelContext = {


      trace,


      capabilityId:
        input.capabilityId,


      input:
        input.payload,



      actor: {

        id:
          input.actorId,

        role:
          "SYSTEM"

      },



      evidence: [],

      hypotheses: [],

      contradictions: [],

      simulations: [],

      risks: [],

      opportunities: [],

      predictions: [],



      metadata: {

        pipeline:
          "CanonicalPipelineRunner",

        phiSfi,

        fS,

        createdAt:
          new Date().toISOString()

      }

    };




    const agentResults:
      PipelineExecutionResult["agentResults"] =
        [];



    const evidence:
      string[] =
        [];




    for (const agent of canonicalAgents) {



      console.log(
        ">>> EXECUTING AGENT:",
        agent.definition.id
      );



      context.evidence ??= [];

      context.hypotheses ??= [];

      context.contradictions ??= [];

      context.simulations ??= [];

      context.risks ??= [];

      context.opportunities ??= [];

      context.predictions ??= [];

      context.metadata ??= {};




      let result;



      try {


        result =
          await agent.execute(context);



      } catch (error) {


        console.error(

          "!!! AGENT FAILED:",

          agent.definition.id,

          error

        );


        throw error;

      }




      agentResults.push({

        agentId:
          agent.definition.id,


        status:
          result.status,


        confidence:
          result.confidence

      });





      if (
        result.evidence.length > 0
      ) {


        evidence.push(

          ...result.evidence.map(

            item =>
              String(item)

          )

        );

      }




      this.eventBus.publish(

        "AGENT_EXECUTED",

        {

          agentId:
            agent.definition.id,


          trace,


          result

        }

      );



    }




    return {


      id:
        randomUUID(),


      trace,


      regime,


      status:
        "COMPLETED",


      agentResults,


      evidence


    };


  }


}