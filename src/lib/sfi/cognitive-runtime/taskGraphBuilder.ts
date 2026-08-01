import type {
  CognitiveTaskPlan
} from "./agents/metaOrchestrator";

import type {
  SfiTaskGraph,
  SfiTaskGraphNode,
  SfiTaskGraphEdge
} from "./types";

import {
  SFI_COGNITIVE_AGENT_REGISTRY
} from "./registry";



const AGENT_EVENTS: Record<string, string> = {

  meta_orchestrator:
    "SFI_TASK_CREATED",

  evidence_hunter:
    "SFI_EVIDENCE_REQUIREMENT_DECLARED",

  historical_scout:
    "historical.reconstruction.completed",

  temporal_resolver:
    "SFI_TEMPORAL_COORDINATE_RESOLVED",

  phenotype_resolver:
    "SFI_PHENOTYPE_RESOLVED",

  context_builder:
    "SFI_CONTEXT_COORDINATE_BUILT",

  social_field_simulator:
    "SFI_SOCIAL_FIELD_SIMULATED",

  economic_field_simulator:
    "SFI_ECONOMIC_FIELD_SIMULATED",

  cultural_simulator:
    "SFI_CULTURAL_FIELD_SIMULATED",

  psychological_simulator:
    "SFI_PSYCHOLOGICAL_FIELD_SIMULATED",

  policy_simulator:
    "SFI_POLICY_FIELD_SIMULATED",

  cross_impact:
    "SFI_CROSS_IMPACT_ANALYZED",

  risk_agent:
    "SFI_RISK_DECLARED",

  trajectory_agent:
    "SFI_TRAJECTORY_ASSESSED",

  opportunity_agent:
    "SFI_OPPORTUNITY_DECLARED",

  multi_stakeholder_bootstrap:
    "SFI_MULTI_STAKEHOLDER_SIMULATED",

  project_execution_manager:
    "SFI_PROJECT_EXECUTION_STATE_DECLARED",

  reality_calibration:
    "SFI_REALITY_CALIBRATED"

};



function getAgentContract(
  agentId: string
) {

  return SFI_COGNITIVE_AGENT_REGISTRY.find(
    agent =>
      agent.id === agentId
  );

}



function createNode(
  agentId: string
): SfiTaskGraphNode {


  const contract =
    getAgentContract(
      agentId
    );


  return {

    id:
      crypto.randomUUID(),


    agentId,


    label:
      contract?.name ??
      agentId,


    requiresEvidence:
      contract?.sourceTables ??
      [],


    authorityLevel:
      contract?.authorityLevel ??
      "analyst",


    humanApprovalRequired:
      contract?.humanApprovalRequired ??
      false

  };

}



function inferRelation(
  from: string,
  to: string
): SfiTaskGraphEdge["relation"] {


  if (
    to === "reality_calibration"
  ) {

    return "calibrates";

  }


  if (

    to === "risk_agent" ||

    to === "opportunity_agent" ||

    to === "project_execution_manager"

  ) {

    return "governs";

  }


  return "feeds";

}



function addEdge(
  edges: SfiTaskGraphEdge[],
  from: string,
  to: string
) {


  edges.push({

    from,

    to,

    relation:
      inferRelation(
        from,
        to
      )

  });


}



function buildCognitiveTopology(
  agents: string[]
): SfiTaskGraphEdge[] {


  const edges: SfiTaskGraphEdge[] = [];



  const exists =
    (id: string) =>
      agents.includes(id);



  /*
    Observation layer
  */

  if (
    exists("meta_orchestrator") &&
    exists("evidence_hunter")
  ) {

    addEdge(
      edges,
      "meta_orchestrator",
      "evidence_hunter"
    );

  }



  if (
    exists("evidence_hunter") &&
    exists("phenotype_resolver")
  ) {

    addEdge(
      edges,
      "evidence_hunter",
      "phenotype_resolver"
    );

  }



  /*
    Reconstruction layer
  */

  if (
    exists("phenotype_resolver") &&
    exists("context_builder")
  ) {

    addEdge(
      edges,
      "phenotype_resolver",
      "context_builder"
    );

  }



  /*
    Context analysis
  */

  if (
    exists("context_builder") &&
    exists("cross_impact")
  ) {

    addEdge(
      edges,
      "context_builder",
      "cross_impact"
    );

  }



  /*
    Simulation branches
  */

  const simulators = [

    "social_field_simulator",

    "economic_field_simulator",

    "cultural_simulator",

    "psychological_simulator",

    "policy_simulator"

  ];



  for (
    const simulator
    of simulators
  ) {


    if (
      exists("cross_impact") &&
      exists(simulator)
    ) {

      addEdge(
        edges,
        "cross_impact",
        simulator
      );

    }

  }



  /*
    Risk aggregation
  */

  for (
    const simulator
    of simulators
  ) {


    if (
      exists(simulator) &&
      exists("risk_agent")
    ) {

      addEdge(
        edges,
        simulator,
        "risk_agent"
      );

    }

  }



  /*
    Opportunity / execution
  */

  if (
    exists("risk_agent") &&
    exists("opportunity_agent")
  ) {

    addEdge(
      edges,
      "risk_agent",
      "opportunity_agent"
    );

  }



  if (
    exists("opportunity_agent") &&
    exists("project_execution_manager")
  ) {

    addEdge(
      edges,
      "opportunity_agent",
      "project_execution_manager"
    );

  }



  /*
    Reality feedback loop
  */

  if (
    exists("risk_agent") &&
    exists("reality_calibration")
  ) {

    addEdge(
      edges,
      "risk_agent",
      "reality_calibration"
    );

  }



  return edges;

}



export function buildTaskGraph(
  plan: CognitiveTaskPlan
): SfiTaskGraph {


  const agents = [

    "meta_orchestrator",

    ...plan.requiredAgents

  ];



  const nodes =
    agents.map(
      createNode
    );



  const edges =
    buildCognitiveTopology(
      agents
    );



  return {

    id:
      crypto.randomUUID(),


    question:
      plan.taskId,


    status:
      "planned",


    eventName:
      "SFI_TASK_CREATED",


    nodes,


    edges,


    minimumEvidence:
      plan.missingInputs,


    blockedReason:
      null

  };

}