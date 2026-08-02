import { canonicalAgents } from '@/core/agents';

type RuntimeActivationStatus =
  | 'REGISTERED'
  | 'EXECUTABLE'
  | 'PLACEHOLDER'
  | 'OPERATIONAL'
  | 'BLOCKED'
  | 'FAILED';

function statusForAgent(agent: (typeof canonicalAgents)[number]): RuntimeActivationStatus {
  const hasExecutor = typeof agent.execute === 'function';
  const hasCapabilities = agent.definition.capabilities.length > 0;
  const looksLikePlaceholder =
    agent.constructor.name.toLowerCase().includes('placeholder') ||
    agent.definition.capabilities.length === 0;

  if (looksLikePlaceholder) return 'PLACEHOLDER';
  if (!hasExecutor) return 'REGISTERED';
  if (!hasCapabilities) return 'BLOCKED';
  return 'EXECUTABLE';
}

export function runRuntimeActivationAudit() {
  const report = canonicalAgents.map((agent) => {
    const status = statusForAgent(agent);

    return {
      id: agent.definition.id,
      name: agent.definition.name,
      type: agent.definition.type,
      capabilities: agent.definition.capabilities,
      readsMemory: agent.definition.readsMemory,
      writesMemory: agent.definition.writesMemory,
      emits: agent.definition.emits,
      humanApprovalRequired: agent.definition.humanApprovalRequired,
      confidenceModel: agent.definition.confidenceModel,
      hasExecutor: typeof agent.execute === 'function',
      status,
      operationalCriteria: {
        hasExecutor: typeof agent.execute === 'function',
        consumesCanonicalContract: true,
        integrationExecutionRequired: true,
        evidenceOrEventRequiredWhenApplicable: true,
      },
    };
  });

  const count = (status: RuntimeActivationStatus) =>
    report.filter((agent) => agent.status === status).length;

  return {
    generatedAt: new Date().toISOString(),
    source: 'src/core/agents/registry.ts',
    note: 'EXECUTABLE is declarative. OPERATIONAL is assigned only by /api/sfi/execution after a real integration run.',
    summary: {
      totalAgents: report.length,
      registered: count('REGISTERED'),
      executable: count('EXECUTABLE'),
      placeholder: count('PLACEHOLDER'),
      operational: count('OPERATIONAL'),
      blocked: count('BLOCKED'),
      failed: count('FAILED'),
    },
    agents: report,
  };
}
