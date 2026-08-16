import type {
  KernelContext,
  KernelEvidence,
  AgentResult,
  AgentDefinition,
  MemoryWriteDefinition,
} from '@/core/contracts';

import { SfiAgent } from './base';

export interface CognitiveTaskPlan {
  taskId: string;
  requiredAgents: string[];
  executionOrder: string[];
  missingInputs: string[];
  readiness: number;
}

const AGENT_IDS = {
  evidence_hunter: 'evidence_hunter',
  phenotype_resolver: 'phenotype_resolver',
  context_builder: 'context_builder',
  cross_impact: 'cross_impact',
  risk_agent: 'risk_agent',
  social_field_simulator: 'social_field_simulator',
  economic_field_simulator: 'economic_field_simulator',
  cultural_simulator: 'cultural_simulator',
  psychological_simulator: 'psychological_simulator',
  policy_simulator: 'policy_simulator',
  reality_calibration: 'reality_calibration',
} as const;

const META_MEMORY_WRITES: MemoryWriteDefinition[] = [
  {
    entityType: 'COGNITIVE_PLAN',
    operation: 'CREATE',
  },
];

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numeric(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function arrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export class MetaOrchestratorAgent extends SfiAgent {
  definition: AgentDefinition = {
    id: 'AGENT_META_ORCHESTRATOR',
    name: 'Meta Orchestrator',
    type: 'ORCHESTRATION',
    capabilities: ['CAPABILITY_META_ORCHESTRATION'],
    readsMemory: [],
    writesMemory: META_MEMORY_WRITES,
    emits: ['SFI_COGNITIVE_PLAN_CREATED'],
    humanApprovalRequired: false,
    confidenceModel: 'signal_coverage',
    status: 'ACTIVE',
  };

  async execute(context: KernelContext): Promise<AgentResult> {
    const requiredAgents: string[] = [];
    const missingInputs: string[] = [];
    const addAgent = (agentId: string) => {
      if (!requiredAgents.includes(agentId)) requiredAgents.push(agentId);
    };
    const addMissing = (input: string) => {
      if (!missingInputs.includes(input)) missingInputs.push(input);
    };

    const hasEvidence = context.evidence.length > 0;
    const hasHypothesis = context.hypotheses.length > 0;

    if (!hasEvidence) {
      addAgent(AGENT_IDS.evidence_hunter);
      addMissing('evidence');
    }

    if (!hasHypothesis) addAgent(AGENT_IDS.phenotype_resolver);

    const cognitiveSpine = record(context.metadata?.cognitiveSpine);
    const spineConsumed = cognitiveSpine.ctSnapshotConsumed === true;
    const verificationDebt = record(cognitiveSpine.verificationDebt);
    const verificationDebtAbsolute = spineConsumed ? numeric(verificationDebt.absolute) : 0;

    // CT state may request more verification, but it never substitutes for
    // evidence. A consumed snapshot with verification debt therefore expands
    // the plan toward evidence collection instead of upgrading confidence.
    if (verificationDebtAbsolute > 0) {
      addAgent(AGENT_IDS.evidence_hunter);
      addMissing('cognitive_spine_verification_debt');
    }

    addAgent(AGENT_IDS.context_builder);
    addAgent(AGENT_IDS.cross_impact);
    addAgent(AGENT_IDS.risk_agent);

    if (context.simulations.length === 0) {
      addAgent(AGENT_IDS.social_field_simulator);
      addAgent(AGENT_IDS.economic_field_simulator);
      addAgent(AGENT_IDS.cultural_simulator);
      addAgent(AGENT_IDS.psychological_simulator);
      addAgent(AGENT_IDS.policy_simulator);
    }

    addAgent(AGENT_IDS.reality_calibration);

    const executionOrder = ['meta_orchestrator', ...requiredAgents];
    const plan: CognitiveTaskPlan = {
      taskId: context.taskId ?? crypto.randomUUID(),
      requiredAgents,
      executionOrder,
      missingInputs,
      readiness: 0,
    };

    const evidence: KernelEvidence = {
      id: crypto.randomUUID(),
      source: 'MetaOrchestratorAgent',
      confidence: 0,
      payload: plan,
    };

    context.evidence.push(evidence);

    const cognitiveContextSignals = spineConsumed
      ? Math.min(
          arrayLength(cognitiveSpine.memoryRefs)
          + arrayLength(cognitiveSpine.decisionRefs)
          + arrayLength(cognitiveSpine.contradictionRefs)
          + arrayLength(cognitiveSpine.questionRefs),
          4,
        )
      : 0;

    const availableSignals =
      context.evidence.length
      + context.hypotheses.length
      + context.simulations.length
      + cognitiveContextSignals;
    const readiness = Math.min(availableSignals / 10, 1);

    plan.readiness = readiness;
    evidence.confidence = readiness;

    const taskGraph = {
      nodes: executionOrder,
      edges: executionOrder
        .map((agent, index) => ({
          from: executionOrder[index - 1],
          to: agent,
        }))
        .filter((edge) => Boolean(edge.from)),
    };

    context.metadata = {
      ...context.metadata,
      cognitivePlan: plan,
      taskGraph,
      metaOrchestrator: {
        executed: true,
        readiness,
        plannedAgents: executionOrder.length,
        taskGraphNodes: taskGraph.nodes.length,
        taskGraphEdges: taskGraph.edges.length,
        cognitiveSpineConsumed: spineConsumed,
        cognitiveSpineContextSignals: cognitiveContextSignals,
        cognitiveSpineVerificationDebt: verificationDebtAbsolute,
        executedAt: new Date().toISOString(),
      },
    };

    return {
      trace: context.trace,
      agentId: this.definition.id,
      status: readiness > 0 ? 'SUCCESS' : 'PARTIAL',
      output: {
        plan,
        taskGraph,
      },
      observations: [],
      evidence: [evidence],
      events: [],
      memoryWrites: META_MEMORY_WRITES,
      confidence: readiness,
      executionTime: 0,
    };
  }
}
