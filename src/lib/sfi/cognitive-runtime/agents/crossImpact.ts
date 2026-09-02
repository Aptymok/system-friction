import type { KernelContext, KernelSimulation } from '../kernelContext';

type ExecutionTargetRef = {
  kind: string;
  id: string;
  title?: string | null;
};

export interface CrossImpactState {
  variableCount: number;
  targetRefs: ExecutionTargetRef[];
  candidatePairCount: number;
  evidenceItemCount: number;
  simulationInputCount: number;
  dominantSignals: string[];
  interactionDensity: number | null;
  systemicCouplingIndex: number | null;
  measurementStatus: 'NOT_OBSERVED' | 'INSUFFICIENT_TARGETS';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function executionTargets(context: KernelContext): ExecutionTargetRef[] {
  const request = record(context.metadata?.executionRequest);
  const values = Array.isArray(request.targets)
    ? request.targets
    : Array.isArray(context.metadata?.targets)
      ? context.metadata.targets
      : [];
  const seen = new Set<string>();
  const targets: ExecutionTargetRef[] = [];
  for (const value of values) {
    const candidate = record(value);
    const kind = typeof candidate.kind === 'string' ? candidate.kind : '';
    const id = typeof candidate.id === 'string' ? candidate.id : '';
    if (!kind || !id) continue;
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      kind,
      id,
      title: typeof candidate.title === 'string' ? candidate.title : null,
    });
  }
  return targets;
}

export function CrossImpactAgent(context: KernelContext): KernelContext {
  const evidence = context.evidence ?? [];
  const simulations = context.simulations ?? [];
  const targets = executionTargets(context);
  const variables = new Set<string>();

  for (const target of targets) variables.add(`${target.kind}:${target.id}`);
  if (!variables.size) {
    for (const item of evidence) if (item.source) variables.add(`evidence-source:${item.source}`);
    for (const simulation of simulations) if (simulation.simulator) variables.add(`simulation:${simulation.simulator}`);
  }

  const variableCount = variables.size;
  const candidatePairCount = variableCount > 1 ? (variableCount * (variableCount - 1)) / 2 : 0;
  const state: CrossImpactState = {
    variableCount,
    targetRefs: targets,
    candidatePairCount,
    evidenceItemCount: evidence.length,
    simulationInputCount: simulations.length,
    dominantSignals: Array.from(variables).slice(0, 8),
    interactionDensity: null,
    systemicCouplingIndex: null,
    measurementStatus: variableCount >= 2 ? 'NOT_OBSERVED' : 'INSUFFICIENT_TARGETS',
  };

  const simulation: KernelSimulation = {
    simulator: 'CrossImpactAgent',
    output: {
      ...state,
      epistemicClass: 'SIMULATED',
      evidenceRefs: evidence.map((item) => item.id),
      direction: record(context.metadata?.executionRequest).direction ?? null,
      timeRange: record(context.metadata?.executionRequest).timeRange ?? null,
      claimBoundary: 'Target pairing and context coverage are observed from the execution request. Coupling magnitude is NOT_OBSERVED unless a separate supported relation method supplies it. LLM interpretation remains INFERENCE.',
    },
  };
  context.simulations.push(simulation);
  context.metadata = {
    ...context.metadata,
    crossImpact: {
      executed: true,
      measurementStatus: state.measurementStatus,
      couplingIndex: state.systemicCouplingIndex,
      interactionDensity: state.interactionDensity,
      variables: state.variableCount,
      targetRefs: state.targetRefs,
      candidatePairCount: state.candidatePairCount,
      evidenceRefs: evidence.map((item) => item.id),
      epistemicClass: 'SIMULATED',
      claimBoundary: 'Cross-impact execution may identify candidate pairings and infer possible interaction, but it does not manufacture a numeric coupling measurement from object count or source count.',
      executedAt: new Date().toISOString(),
    },
  };
  return context;
}
