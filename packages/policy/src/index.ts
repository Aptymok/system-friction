export type PolicyEpistemicClass = 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';

export type PolicyThresholds = {
  minConfidence: number;
  maxDelta: number;
  allowSimulated: boolean;
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  thresholds: PolicyThresholds;
  trace: string[];
};

const defaultThresholds: Record<PolicyEpistemicClass, PolicyThresholds> = {
  observed: { minConfidence: 0.55, maxDelta: 0.7, allowSimulated: false },
  declared: { minConfidence: 0.5, maxDelta: 0.7, allowSimulated: false },
  derived: { minConfidence: 0.45, maxDelta: 0.65, allowSimulated: false },
  inferred: { minConfidence: 0.6, maxDelta: 0.5, allowSimulated: false },
  simulated: { minConfidence: 0.8, maxDelta: 0.35, allowSimulated: true },
  fixture: { minConfidence: 1, maxDelta: 0, allowSimulated: false },
  missing: { minConfidence: 1, maxDelta: 0, allowSimulated: false },
};

export function evaluatePolicy(input: {
  epistemicClass: PolicyEpistemicClass;
  confidence: number;
  deltaScore: number;
  hasSimulatedSources?: boolean;
  thresholds?: Partial<PolicyThresholds>;
}): PolicyDecision {
  const thresholds = { ...defaultThresholds[input.epistemicClass], ...input.thresholds };
  const trace = [
    `epistemic_class=${input.epistemicClass}`,
    `confidence=${input.confidence}`,
    `delta=${input.deltaScore}`,
  ];

  if (input.confidence < thresholds.minConfidence) {
    return { allowed: false, reason: 'confidence_below_threshold', thresholds, trace };
  }

  if (input.deltaScore > thresholds.maxDelta) {
    return { allowed: false, reason: 'delta_above_threshold', thresholds, trace };
  }

  if (input.hasSimulatedSources && !thresholds.allowSimulated) {
    return { allowed: false, reason: 'simulated_sources_blocked', thresholds, trace };
  }

  return { allowed: true, reason: 'policy_allowed', thresholds, trace };
}
