import {
  SFI_COGNITIVE_AGENT_REGISTRY,
} from "./registry";

import {
  SFI_AGENT_EXECUTION_MAP,
} from "./agentExecutionMap";


export function runRuntimeActivationAudit() {

  const report = SFI_COGNITIVE_AGENT_REGISTRY.map(agent => {

    const hasExecutor =
      typeof SFI_AGENT_EXECUTION_MAP[agent.id] === "function";

    return {
      id: agent.id,
      layer: agent.layer,
      operationalMode: agent.operationalMode,
      missingCapability: agent.missingCapability,
      hasExecutor,
      status:
        hasExecutor && !agent.missingCapability
          ? "READY"
          : "BLOCKED",
    };

  });


  return {
    generatedAt: new Date().toISOString(),

    summary: {
      totalAgents: report.length,

      ready:
        report.filter(
          a => a.status === "READY"
        ).length,

      blocked:
        report.filter(
          a => a.status === "BLOCKED"
        ).length,
    },

    agents: report,
  };
}