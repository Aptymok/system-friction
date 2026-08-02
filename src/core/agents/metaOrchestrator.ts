import type {
  KernelContext,
  KernelEvidence,
  AgentResult,
  AgentDefinition,
  MemoryWriteDefinition
} from "@/core/contracts";

import { SfiAgent } from "./base";


export interface CognitiveTaskPlan {

  taskId: string;

  requiredAgents: string[];

  executionOrder: string[];

  missingInputs: string[];

  readiness: number;

}


/**
 * Canonical Cognitive Runtime Agent IDs
 */
const AGENT_IDS = {

  evidence_hunter:
    "evidence_hunter",

  phenotype_resolver:
    "phenotype_resolver",

  context_builder:
    "context_builder",

  cross_impact:
    "cross_impact",

  risk_agent:
    "risk_agent",

  social_field_simulator:
    "social_field_simulator",

  economic_field_simulator:
    "economic_field_simulator",

  cultural_simulator:
    "cultural_simulator",

  psychological_simulator:
    "psychological_simulator",

  policy_simulator:
    "policy_simulator",

  reality_calibration:
    "reality_calibration"

} as const;



const META_MEMORY_WRITES: MemoryWriteDefinition[] = [

  {
    entityType:
      "COGNITIVE_PLAN",

    operation:
      "CREATE"
  }

];



export class MetaOrchestratorAgent extends SfiAgent {


  definition: AgentDefinition = {


    id:
      "AGENT_META_ORCHESTRATOR",


    name:
      "Meta Orchestrator",


    type:
      "ORCHESTRATION",


    capabilities: [

      "CAPABILITY_META_ORCHESTRATION"

    ],


    readsMemory: [],


    writesMemory:

      META_MEMORY_WRITES,


    emits: [

      "SFI_COGNITIVE_PLAN_CREATED"

    ],


    humanApprovalRequired:

      false,


    confidenceModel:

      "signal_coverage",


    status:

      "ACTIVE"

  };



  async execute(
    context: KernelContext
  ): Promise<AgentResult> {



    const requiredAgents: string[] = [];

    const missingInputs: string[] = [];



    const hasEvidence =
      context.evidence.length > 0;



    const hasHypothesis =
      context.hypotheses.length > 0;



    if (!hasEvidence) {

      requiredAgents.push(
        AGENT_IDS.evidence_hunter
      );


      missingInputs.push(
        "evidence"
      );

    }



    if (!hasHypothesis) {

      requiredAgents.push(
        AGENT_IDS.phenotype_resolver
      );

    }



    requiredAgents.push(

      AGENT_IDS.context_builder,

      AGENT_IDS.cross_impact,

      AGENT_IDS.risk_agent

    );



    if (
      context.simulations.length === 0
    ) {

      requiredAgents.push(

        AGENT_IDS.social_field_simulator,

        AGENT_IDS.economic_field_simulator,

        AGENT_IDS.cultural_simulator,

        AGENT_IDS.psychological_simulator,

        AGENT_IDS.policy_simulator

      );

    }



    requiredAgents.push(

      AGENT_IDS.reality_calibration

    );



    const executionOrder = [

      "meta_orchestrator",

      ...requiredAgents

    ];



    const plan: CognitiveTaskPlan = {


      taskId:

        context.taskId ??
        crypto.randomUUID(),


      requiredAgents,


      executionOrder,


      missingInputs,


      readiness:

        0

    };



    const evidence: KernelEvidence = {


      id:

        crypto.randomUUID(),


      source:

        "MetaOrchestratorAgent",


      confidence:

        0,


      payload:

        plan

    };



    context.evidence.push(

      evidence

    );



    const availableSignals =

      context.evidence.length +

      context.hypotheses.length +

      context.simulations.length;



    const readiness =

      Math.min(

        availableSignals / 10,

        1

      );



    plan.readiness = readiness;


    evidence.confidence = readiness;



    const taskGraph = {


      nodes:

        executionOrder,


      edges:

        executionOrder

          .map(

            (agent,index)=>({

              from:

                executionOrder[index - 1],

              to:

                agent

            })

          )

          .filter(

            edge =>
              Boolean(edge.from)

          )

    };



    context.metadata = {


      ...context.metadata,


      cognitivePlan:

        plan,


      taskGraph,


      metaOrchestrator: {


        executed:

          true,


        readiness,


        plannedAgents:

          executionOrder.length,


        taskGraphNodes:

          taskGraph.nodes.length,


        taskGraphEdges:

          taskGraph.edges.length,


        executedAt:

          new Date().toISOString()

      }

    };



    return {


      trace:

        context.trace,


      agentId:

        this.definition.id,


      status:

        readiness > 0 ? "SUCCESS" : "PARTIAL",


      output: {


        plan,


        taskGraph

      },


      observations: [],


      evidence: [

        evidence

      ],


      events: [],


      memoryWrites:

        META_MEMORY_WRITES,


      confidence:

        readiness,


      executionTime:

        0

    };

  }

}
