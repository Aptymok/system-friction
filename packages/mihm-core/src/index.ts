export type MihmMetricKey = 'ihg' | 'nti' | 'ldi' | 'phi';

export type MihmRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type NodeType = 'field' | 'agent' | 'source' | 'interface' | 'integration' | 'security' | 'unknown';

export type CapacityLevel = 'high' | 'medium' | 'low' | 'critical';

export type MihmVector = {
  ihg: number;
  nti: number;
  ldi: number;
  phi?: number;
};

export type SFINode = {
  id: string;
  type: NodeType;
  vector: MihmVector;
  weight?: number;
  qualified?: boolean;
  qualification?: number;
};

export type MihmComputationInput = {
  observedAt: string;
  sourceIds: string[];
  vector: MihmVector;
};

export type MihmComputationResult = {
  regime: MihmRegime;
  vector: MihmVector;
  confidence: number;
  warnings: string[];
};

export type ReducedMihmCampoInput = {
  confidence: number;
  sourceState: 'observed' | 'degraded' | 'missing';
  nodes: Array<{
    type: string;
    weight: number;
    value: number | null;
    nti: number | null;
    simulated: boolean;
  }>;
};

export type ReducedMihmGraphInput = {
  sourceState: 'observed' | 'degraded' | 'missing';
  nodes: unknown[];
  edges: Array<{ weight?: number | null }>;
};

export type ReducedMihmInput = {
  observedAt: string;
  campo: ReducedMihmCampoInput;
  graph: ReducedMihmGraphInput;
};

export type ReducedMihmResult = MihmComputationResult & {
  sourceIds: string[];
  degradation: number;
  operationalCapacity: number;
};

export function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function qualifyNode(node: SFINode, delta = 0): SFINode {
  const ihg = clamp01(node.vector.ihg);
  const nti = clamp01(node.vector.nti);
  const ldi = clamp01(node.vector.ldi);
  const phi = clamp01(node.vector.phi ?? ihg * (1 - ldi) * (1 - nti * 0.5));
  const qualification = clamp01((ihg * 0.45) + ((1 - nti) * 0.2) + ((1 - ldi) * 0.25) + (phi * 0.1) + delta);

  return {
    ...node,
    vector: { ihg, nti, ldi, phi },
    qualified: qualification >= 0.5,
    qualification,
  };
}

export function degradeNode(
  node: SFINode,
  alpha: number,
  elapsed: number,
  initialDegradation = 0,
) {
  const pressure = clamp01((node.vector.nti * 0.45) + (node.vector.ldi * 0.45) + ((1 - node.vector.ihg) * 0.1));
  const timeLoad = Math.max(0, elapsed) * Math.max(0, alpha);
  return clamp01(initialDegradation + pressure * timeLoad);
}

export function operationalCapacity(
  node: SFINode,
  degradation: number,
  weightIn: number,
  weightOut: number,
) {
  const qualified = qualifyNode(node);
  const flowBalance = clamp01((Math.max(0, weightIn) + Math.max(0, weightOut)) / 2);
  const integrity = clamp01((qualified.vector.ihg * 0.4) + ((1 - qualified.vector.nti) * 0.2) + ((1 - qualified.vector.ldi) * 0.2) + ((qualified.vector.phi ?? 0) * 0.2));
  return clamp01(integrity * (1 - clamp01(degradation)) * (0.5 + flowBalance * 0.5));
}

export function capacityLevel(co: number): CapacityLevel {
  const capacity = clamp01(co);
  if (capacity >= 0.75) return 'high';
  if (capacity >= 0.5) return 'medium';
  if (capacity >= 0.25) return 'low';
  return 'critical';
}

export function deriveRegime(
  phi: number,
  degradation: number,
  operationalCapacityValue: number,
): MihmRegime {
  const p = clamp01(phi);
  const d = clamp01(degradation);
  const co = clamp01(operationalCapacityValue);

  if (p < 0.25 || d >= 0.75 || co < 0.25) return 'critical';
  if (p < 0.5 || d >= 0.45 || co < 0.5) return 'watch';
  return 'stable';
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function computeReducedMihm(input: ReducedMihmInput): ReducedMihmResult {
  const campoNodes = input.campo.nodes;
  const graphNodeCount = input.graph.nodes.length;
  const graphEdgeCount = input.graph.edges.length;
  const totalGraph = Math.max(1, graphNodeCount + graphEdgeCount);
  const graphDensity = clamp01(graphEdgeCount / totalGraph);
  const avgWeight = clamp01(average(campoNodes.map((node) => node.weight)));
  const avgValue = clamp01(average(campoNodes.map((node) => typeof node.value === 'number' ? node.value : 0)));
  const avgNti = clamp01(average(campoNodes.map((node) => typeof node.nti === 'number' ? node.nti : 0)));
  const simulatedRatio = clamp01(campoNodes.filter((node) => node.simulated).length / Math.max(1, campoNodes.length));
  const sourcePenalty = input.campo.sourceState === 'missing'
    ? 1
    : input.campo.sourceState === 'degraded'
      ? 0.45
      : 0;
  const graphPenalty = input.graph.sourceState === 'observed' && graphEdgeCount > 0 ? 0 : 0.35;

  const ihg = clamp01((input.campo.confidence * 0.45) + (avgWeight * 0.25) + (graphDensity * 0.2) + (avgValue * 0.1));
  const nti = clamp01((avgNti * 0.55) + (sourcePenalty * 0.25) + (simulatedRatio * 0.2));
  const ldi = clamp01((sourcePenalty * 0.45) + (graphPenalty * 0.25) + ((1 - input.campo.confidence) * 0.2) + (simulatedRatio * 0.1));
  const phi = clamp01(ihg * (1 - ldi) * (1 - (nti * 0.35)));
  const qualified = qualifyNode({
    id: 'sfi.kernel',
    type: 'field',
    vector: { ihg, nti, ldi, phi },
    weight: avgWeight,
  });
  const degradation = degradeNode(qualified, 0.35, 1, ldi * 0.25);
  const operationalCapacityValue = operationalCapacity(qualified, degradation, avgWeight, graphDensity);
  const warnings = [
    ...(input.campo.sourceState === 'observed' ? [] : [`campo_${input.campo.sourceState}`]),
    ...(input.graph.sourceState === 'observed' && graphEdgeCount > 0 ? [] : ['graph_not_observed']),
    ...(simulatedRatio > 0 ? ['simulated_sources_present'] : []),
  ];

  return {
    regime: deriveRegime(phi, degradation, operationalCapacityValue),
    vector: {
      ihg: Number(ihg.toFixed(4)),
      nti: Number(nti.toFixed(4)),
      ldi: Number(ldi.toFixed(4)),
      phi: Number(phi.toFixed(4)),
    },
    confidence: Number(clamp01(input.campo.confidence * (1 - (sourcePenalty * 0.3)) * (1 - (graphPenalty * 0.2))).toFixed(4)),
    warnings,
    sourceIds: campoNodes.map((node) => node.type),
    degradation: Number(degradation.toFixed(4)),
    operationalCapacity: Number(operationalCapacityValue.toFixed(4)),
  };
}
