export type DeltaVector = {
  confidence: number;
  sourceDegradation: number;
  ontologySpread: number;
  ntiPressure: number;
};

export type DeltaInput = {
  confidence: number;
  sourceState: 'observed' | 'degraded' | 'missing';
  nodes: Array<{ weight: number; nti: number | null; ontologyDistance: number; simulated: boolean }>;
};

export type DeltaResult = {
  vector: DeltaVector;
  score: number;
  trace: string[];
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function computeDelta(input: DeltaInput): DeltaResult {
  const confidenceGap = 1 - clamp01(input.confidence);
  const sourceDegradation = input.sourceState === 'missing'
    ? 1
    : input.sourceState === 'degraded'
      ? 0.55
      : 0;
  const ontologySpread = clamp01(average(input.nodes.map((node) => node.ontologyDistance)));
  const ntiPressure = clamp01(average(input.nodes.map((node) => node.nti ?? 0)) + (input.nodes.some((node) => node.simulated) ? 0.15 : 0));
  const vector = {
    confidence: Number(confidenceGap.toFixed(4)),
    sourceDegradation: Number(sourceDegradation.toFixed(4)),
    ontologySpread: Number(ontologySpread.toFixed(4)),
    ntiPressure: Number(ntiPressure.toFixed(4)),
  };
  const score = clamp01((vector.confidence * 0.25) + (vector.sourceDegradation * 0.35) + (vector.ontologySpread * 0.15) + (vector.ntiPressure * 0.25));

  return {
    vector,
    score: Number(score.toFixed(4)),
    trace: [
      `confidence_gap=${vector.confidence}`,
      `source_degradation=${vector.sourceDegradation}`,
      `ontology_spread=${vector.ontologySpread}`,
      `nti_pressure=${vector.ntiPressure}`,
    ],
  };
}
