export type KernelDeltaInput = {
  campo: {
    confidence: number;
    sourceState: 'observed' | 'degraded' | 'missing';
    nodes: Array<{ ontologyDistance: number; nti: number | null; simulated: boolean }>;
  };
  mihm: {
    confidence: number;
    degradation: number;
    operationalCapacity: number;
    vector: { nti: number; ldi: number; phi?: number };
    warnings: string[];
  };
};

export type KernelDeltaResult = {
  vector: {
    confidenceGap: number;
    sourceDegradation: number;
    ontologySpread: number;
    ntiPressure: number;
    mihmDegradation: number;
    capacityGap: number;
  };
  score: number;
  trace: string[];
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function computeKernelDelta(input: KernelDeltaInput): KernelDeltaResult {
  const confidenceGap = 1 - clamp01((input.campo.confidence + input.mihm.confidence) / 2);
  const sourceDegradation = input.campo.sourceState === 'missing'
    ? 1
    : input.campo.sourceState === 'degraded'
      ? 0.55
      : 0;
  const ontologySpread = clamp01(average(input.campo.nodes.map((node) => node.ontologyDistance)));
  const ntiPressure = clamp01(
    average(input.campo.nodes.map((node) => node.nti ?? 0))
    + (input.campo.nodes.some((node) => node.simulated) ? 0.15 : 0)
    + (input.mihm.vector.nti * 0.2),
  );
  const mihmDegradation = clamp01(input.mihm.degradation + (input.mihm.vector.ldi * 0.2));
  const capacityGap = clamp01(1 - input.mihm.operationalCapacity);
  const vector = {
    confidenceGap: Number(confidenceGap.toFixed(4)),
    sourceDegradation: Number(sourceDegradation.toFixed(4)),
    ontologySpread: Number(ontologySpread.toFixed(4)),
    ntiPressure: Number(ntiPressure.toFixed(4)),
    mihmDegradation: Number(mihmDegradation.toFixed(4)),
    capacityGap: Number(capacityGap.toFixed(4)),
  };
  const score = clamp01(
    (vector.confidenceGap * 0.18)
    + (vector.sourceDegradation * 0.22)
    + (vector.ontologySpread * 0.1)
    + (vector.ntiPressure * 0.18)
    + (vector.mihmDegradation * 0.18)
    + (vector.capacityGap * 0.14),
  );

  return {
    vector,
    score: Number(score.toFixed(4)),
    trace: [
      `confidence_gap=${vector.confidenceGap}`,
      `source_degradation=${vector.sourceDegradation}`,
      `ontology_spread=${vector.ontologySpread}`,
      `nti_pressure=${vector.ntiPressure}`,
      `mihm_degradation=${vector.mihmDegradation}`,
      `capacity_gap=${vector.capacityGap}`,
    ],
  };
}
