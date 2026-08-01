import type {
  KernelContext,
  KernelEvidence
} from "../kernelContext";

import {
  buildTaskGraph
} from "../taskGraphBuilder";


export interface CognitiveTaskPlan {

  taskId: string;

  requiredAgents: string[];

  executionOrder: string[];

  missingInputs: string[];

  readiness: number;

}


/**
 * Canonical Cognitive Runtime Agent IDs
 *
 * Cada nodo corresponde a un executor real.
 * No existen agrupaciones abstractas.
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



export function MetaOrchestratorAgent(
  context: KernelContext
): KernelContext {


  const requiredAgents: string[] = [];

  const missingInputs: string[] = [];



  const hasEvidence =
    context.evidence.length > 0;


  const hasHypothesis =
    context.hypotheses.length > 0;



  /*
    Evidence acquisition
  */

  if (!hasEvidence) {

    requiredAgents.push(
      AGENT_IDS.evidence_hunter
    );


    missingInputs.push(
      "evidence"
    );

  }



  /*
    Phenomenon resolution
  */

  if (!hasHypothesis) {

    requiredAgents.push(
      AGENT_IDS.phenotype_resolver
    );

  }



  /*
    Context construction
  */

  requiredAgents.push(
    AGENT_IDS.context_builder
  );



  /*
    System coupling analysis
  */

  requiredAgents.push(
    AGENT_IDS.cross_impact
  );



  /*
    Risk evaluation
  */

  requiredAgents.push(
    AGENT_IDS.risk_agent
  );



  /*
    Simulation layer
  */

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



  /*
    Reality validation
  */

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



  /*
    Persist orchestrator observation
  */

  context.evidence.push(
    evidence
  );



  /*
    Calculate readiness
  */

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



  /*
    Build executable cognitive graph
  */

  const taskGraph =
    buildTaskGraph(
      plan
    );



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



  return context;

}