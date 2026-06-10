import { calculateAttractorWeight, calculateEjectorWeight, clamp01 } from './math';

export type SfiGraphNode = {
  nodeKey: string;
  label: string;
  module: string;
  nodeType: string;
  layer: number;
  density: number;
  weight: number;
  degradation: number;
  evidenceCount: number;
};

export type SfiGraphEdge = {
  fromKey: string;
  toKey: string;
  edgeType: string;
  weight: number;
  evidenceCount: number;
  degradation: number;
};

export function normalizeGraphNode(node: Partial<SfiGraphNode> & Pick<SfiGraphNode, 'nodeKey' | 'label' | 'module' | 'nodeType'>): SfiGraphNode {
  const density = clamp01(node.density ?? 0);
  const degradation = clamp01(node.degradation ?? 0);
  const evidenceCount = Math.max(0, Math.floor(node.evidenceCount ?? 0));

  return {
    nodeKey: node.nodeKey,
    label: node.label,
    module: node.module,
    nodeType: node.nodeType,
    layer: Math.max(1, Math.floor(node.layer ?? 1)),
    density,
    weight: clamp01(node.weight ?? density * (1 - degradation)),
    degradation,
    evidenceCount,
  };
}

export function normalizeGraphEdge(edge: Partial<SfiGraphEdge> & Pick<SfiGraphEdge, 'fromKey' | 'toKey' | 'edgeType'>): SfiGraphEdge {
  const degradation = clamp01(edge.degradation ?? 0);
  const evidenceCount = Math.max(0, Math.floor(edge.evidenceCount ?? 0));

  return {
    fromKey: edge.fromKey,
    toKey: edge.toKey,
    edgeType: edge.edgeType,
    weight: clamp01(edge.weight ?? evidenceCount / 10) * (1 - degradation),
    evidenceCount,
    degradation,
  };
}

export function scoreGraphAttractor(input: {
  density: number;
  confidence: number;
  persistence: number;
  trust: number;
  degradation: number;
}): number {
  return calculateAttractorWeight(input);
}

export function scoreGraphEjector(input: {
  contradiction: number;
  unresolvedDebt: number;
  decay: number;
  externalPressure: number;
}): number {
  return calculateEjectorWeight(input);
}
