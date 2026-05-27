export type KernelPolicyDecision = {
  allowed: boolean;
  status: 'committed' | 'degraded' | 'blocked';
  reason: string;
  thresholds: {
    minConfidence: number;
    maxDelta: number;
    minOperationalCapacity: number;
  };
  trace: string[];
};

export function evaluateKernelPolicy(input: {
  sourceState: 'observed' | 'degraded' | 'missing';
  confidence: number;
  deltaScore: number;
  operationalCapacity: number;
  hasSimulatedSources?: boolean;
  warnings?: string[];
}): KernelPolicyDecision {
  const thresholds = {
    minConfidence: input.sourceState === 'observed' ? 0.45 : 0.55,
    maxDelta: input.sourceState === 'observed' ? 0.72 : 0.55,
    minOperationalCapacity: 0.25,
  };
  const trace = [
    `source_state=${input.sourceState}`,
    `confidence=${input.confidence}`,
    `delta=${input.deltaScore}`,
    `operational_capacity=${input.operationalCapacity}`,
    ...(input.warnings ?? []).map((warning) => `warning=${warning}`),
  ];

  if (input.sourceState === 'missing') {
    return { allowed: false, status: 'blocked', reason: 'worldspect_missing', thresholds, trace };
  }

  if (input.confidence < thresholds.minConfidence) {
    return { allowed: false, status: 'blocked', reason: 'confidence_below_threshold', thresholds, trace };
  }

  if (input.deltaScore > thresholds.maxDelta) {
    return { allowed: true, status: 'degraded', reason: 'delta_above_observed_band', thresholds, trace };
  }

  if (input.operationalCapacity < thresholds.minOperationalCapacity) {
    return { allowed: true, status: 'degraded', reason: 'capacity_below_operational_band', thresholds, trace };
  }

  if (input.hasSimulatedSources) {
    return { allowed: true, status: 'degraded', reason: 'simulated_sources_present', thresholds, trace };
  }

  return { allowed: true, status: 'committed', reason: 'policy_allowed', thresholds, trace };
}
