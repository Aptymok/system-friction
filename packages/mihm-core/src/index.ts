export type MihmMetricKey = 'ihg' | 'nti' | 'ldi' | 'continuity';

export type MihmRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type NodeType = 'field' | 'agent' | 'source' | 'interface' | 'integration' | 'security' | 'unknown';

export type CapacityLevel = 'high' | 'medium' | 'low' | 'critical';

export type MihmVector = {
  ihg: number;
  nti: number;
  ldi: number;
  continuity?: number;
  /** @deprecated Compatibility alias. This is not a canonical MIHM Phi. */
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
  metricContract: {
    id: 'REDUCED_KERNEL_CONTINUITY';
    canonicalPhi: false;
    legacyAlias: 'phi';
  };
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

function continuityValue(vector: MihmVector): number {
  return clamp01(vector.continuity ?? vector.phi ?? vector.ihg * (1 - vector.ldi) * (1 - vector.nti * 0.5));
}

export function qualifyNode(node: SFINode, delta = 0): SFINode {
  const ihg = clamp01(node.vector.ihg);
  const nti = clamp01(node.vector.nti);
  const ldi = clamp01(node.vector.ldi);
  const continuity = continuityValue({ ...node.vector, ihg, nti, ldi });
  const qualification = clamp01((ihg * 0.45) + ((1 - nti) * 0.2) + ((1 - ldi) * 0.25) + (continuity * 0.1) + delta);

  return {
    ...node,
    vector: { ihg, nti, ldi, continuity, phi: continuity },
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
  const continuity = continuityValue(qualified.vector);
  const integrity = clamp01((qualified.vector.ihg * 0.4) + ((1 - qualified.vector.nti) * 0.2) + ((1 - qualified.vector.ldi) * 0.2) + (continuity * 0.2));
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
  continuity: number,
  degradation: number,
  operationalCapacityValue: number,
): MihmRegime {
  const c = clamp01(continuity);
  const d = clamp01(degradation);
  const co = clamp01(operationalCapacityValue);

  if (c < 0.25 || d >= 0.75 || co < 0.25) return 'critical';
  if (c < 0.5 || d >= 0.45 || co < 0.5) return 'watch';
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
  const continuity = clamp01(ihg * (1 - ldi) * (1 - (nti * 0.35)));
  const qualified = qualifyNode({
    id: 'sfi.kernel',
    type: 'field',
    vector: { ihg, nti, ldi, continuity },
    weight: avgWeight,
  });
  const degradation = degradeNode(qualified, 0.35, 1, ldi * 0.25);
  const operationalCapacityValue = operationalCapacity(qualified, degradation, avgWeight, graphDensity);
  const warnings = [
    'legacy_phi_alias_only',
    ...(input.campo.sourceState === 'observed' ? [] : [`campo_${input.campo.sourceState}`]),
    ...(input.graph.sourceState === 'observed' && graphEdgeCount > 0 ? [] : ['graph_not_observed']),
    ...(simulatedRatio > 0 ? ['simulated_sources_present'] : []),
  ];

  return {
    regime: deriveRegime(continuity, degradation, operationalCapacityValue),
    vector: {
      ihg: Number(ihg.toFixed(4)),
      nti: Number(nti.toFixed(4)),
      ldi: Number(ldi.toFixed(4)),
      continuity: Number(continuity.toFixed(4)),
      phi: Number(continuity.toFixed(4)),
    },
    confidence: Number(clamp01(input.campo.confidence * (1 - (sourcePenalty * 0.3)) * (1 - (graphPenalty * 0.2))).toFixed(4)),
    warnings,
    metricContract: {
      id: 'REDUCED_KERNEL_CONTINUITY',
      canonicalPhi: false,
      legacyAlias: 'phi',
    },
    sourceIds: campoNodes.map((node) => node.type),
    degradation: Number(degradation.toFixed(4)),
    operationalCapacity: Number(operationalCapacityValue.toFixed(4)),
  };
}


/**
 * MIHM Foundation F1 — bounded topology contrast.
 * Research-grade descriptive comparator only; no identity, causality, prediction or canonical Phi.
 * Source-state and coverage flags are caller declarations, not evidence admission.
 */
export type MihmTopologyRelation = {
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
};

export type MihmTopologySnapshot = {
  boundaryId: string;
  relationSemanticsId: string;
  observedAt: string;
  sourceState: 'OBSERVED' | 'SIMULATED' | 'NOT_OBSERVED';
  coverage: 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
  nodeIds: string[];
  relations: MihmTopologyRelation[];
  evidenceRefs: string[];
};

export type MihmTopologyProtocol = {
  boundaryId: string;
  relationSemanticsId: string;
  observerId: string;
  resolution: 'NODE_RELATION';
  temporalResolution: 'INSTANT' | 'DAILY' | 'WEEKLY';
  directed: boolean;
};

export type MihmTopologyContrast = {
  contract: 'MIHM-TOPOLOGY-CONTRAST-1.0';
  status: 'STRUCTURAL_CHANGE' | 'EQUIVALENT_WITHIN_PROTOCOL' | 'INDETERMINATE';
  epistemicClass: 'DERIVED' | 'SIMULATED' | 'UNKNOWN';
  protocol: MihmTopologyProtocol;
  counts: {
    beforeNodes: number;
    afterNodes: number;
    beforeRelations: number;
    afterRelations: number;
    aggregatesEqual: boolean;
  } | null;
  delta: {
    addedNodes: string[];
    removedNodes: string[];
    addedRelations: Array<MihmTopologyRelation & { count: number }>;
    removedRelations: Array<MihmTopologyRelation & { count: number }>;
    weakComponentsBefore: number;
    weakComponentsAfter: number;
  } | null;
  missing: string[];
  limitations: string[];
};

/**
 * Compare two complete, identity-stable, same-boundary snapshots at one declared resolution.
 * Parallel relations are counted, orientation is predeclared, and observations never become proof
 * of ontology. Weights, causal attribution and predictive claims are explicitly out of scope.
 */
export function compareMihmTopology(input: {
  protocol: MihmTopologyProtocol;
  before: MihmTopologySnapshot;
  after: MihmTopologySnapshot;
}): MihmTopologyContrast {
  const { protocol, before, after } = input;
  const missing: string[] = [];
  const limitations = [
    'Topology contrast does not establish individual identity, emergence, causality or prediction.',
    'Stable node identifiers and relation semantics must be independently justified; relabeling can mimic change.',
    'Relation weights and unobserved relations are not measured by this NODE_RELATION protocol.',
    'Caller-provided OBSERVED and COMPLETE labels do not constitute independent evidence adjudication.',
  ];
  const epistemicClass: MihmTopologyContrast['epistemicClass'] =
    before.sourceState === 'NOT_OBSERVED' || after.sourceState === 'NOT_OBSERVED' ? 'UNKNOWN' :
    before.sourceState === 'SIMULATED' || after.sourceState === 'SIMULATED' ? 'SIMULATED' : 'DERIVED';
  const base = {
    contract: 'MIHM-TOPOLOGY-CONTRAST-1.0' as const,
    protocol, epistemicClass, limitations,
  };
  const validName = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value === value.trim();
  if (!validName(protocol.boundaryId) || !validName(protocol.relationSemanticsId) || !validName(protocol.observerId) ||
      protocol.resolution !== 'NODE_RELATION' || !['INSTANT', 'DAILY', 'WEEKLY'].includes(protocol.temporalResolution) ||
      typeof protocol.directed !== 'boolean') {
    missing.push('valid predeclared observer, boundary, relation semantics, temporal resolution and orientation');
  }
  if (before.boundaryId !== protocol.boundaryId || after.boundaryId !== protocol.boundaryId) {
    missing.push('both snapshots must use the predeclared boundary');
  }
  if (before.relationSemanticsId !== protocol.relationSemanticsId || after.relationSemanticsId !== protocol.relationSemanticsId) {
    missing.push('both snapshots must use the predeclared relation semantics');
  }
  if (before.coverage !== 'COMPLETE' || after.coverage !== 'COMPLETE') {
    missing.push('complete node and edge census at both times');
  }
  if (!['OBSERVED', 'SIMULATED'].includes(before.sourceState) ||
      !['OBSERVED', 'SIMULATED'].includes(after.sourceState)) {
    missing.push('two observed or explicitly simulated snapshots');
  }
  const firstTime = Date.parse(before.observedAt), secondTime = Date.parse(after.observedAt);
  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime) || secondTime <= firstTime) {
    missing.push('valid ordered T0 and T1 observation timestamps');
  }
  for (const [label, snapshot] of [['T0', before], ['T1', after]] as const) {
    if (!Array.isArray(snapshot.nodeIds) || snapshot.nodeIds.length === 0 ||
        snapshot.nodeIds.some((id) => !validName(id)) || new Set(snapshot.nodeIds).size !== snapshot.nodeIds.length) {
      missing.push(label + ': nonempty unique stable node identifiers');
    }
    if (!Array.isArray(snapshot.relations) || snapshot.relations.some((r) =>
          !r || !validName(r.sourceNodeId) || !validName(r.targetNodeId) || !validName(r.relation) ||
          !Array.isArray(snapshot.nodeIds) || !snapshot.nodeIds.includes(r.sourceNodeId) ||
          !snapshot.nodeIds.includes(r.targetNodeId))) {
      missing.push(label + ': relations with valid endpoints and typed relation labels');
    }
    if (snapshot.sourceState === 'OBSERVED' &&
        (!Array.isArray(snapshot.evidenceRefs) || !snapshot.evidenceRefs.some(validName))) {
      missing.push(label + ': evidence references for observational claim');
    }
  }
  if (missing.length) return { ...base, status: 'INDETERMINATE', counts: null, delta: null, missing };

  // JSON tuples prevent identifier collisions; a multiset preserves parallel edge multiplicity.
  const keyed = (relation: MihmTopologyRelation) => {
    const [source, target] = protocol.directed || relation.sourceNodeId <= relation.targetNodeId
      ? [relation.sourceNodeId, relation.targetNodeId]
      : [relation.targetNodeId, relation.sourceNodeId];
    return JSON.stringify([source, target, relation.relation]);
  };
  const bag = (relations: MihmTopologyRelation[]) => {
    const counts = new Map<string, number>();
    for (const relation of relations) {
      const key = keyed(relation);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const oldBag = bag(before.relations), newBag = bag(after.relations);
  const addedRelations: Array<MihmTopologyRelation & { count: number }> = [];
  const removedRelations: Array<MihmTopologyRelation & { count: number }> = [];
  for (const key of [...new Set([...oldBag.keys(), ...newBag.keys()])].sort()) {
    const change = (newBag.get(key) ?? 0) - (oldBag.get(key) ?? 0);
    const [sourceNodeId, targetNodeId, relation] = JSON.parse(key) as [string, string, string];
    if (change > 0) addedRelations.push({ sourceNodeId, targetNodeId, relation, count: change });
    if (change < 0) removedRelations.push({ sourceNodeId, targetNodeId, relation, count: -change });
  }
  const oldNodes = new Set(before.nodeIds), newNodes = new Set(after.nodeIds);
  const addedNodes = after.nodeIds.filter((id) => !oldNodes.has(id)).sort();
  const removedNodes = before.nodeIds.filter((id) => !newNodes.has(id)).sort();
  const weakComponents = (snapshot: MihmTopologySnapshot) => {
    const neighbors = new Map(snapshot.nodeIds.map((id) => [id, new Set<string>()]));
    for (const edge of snapshot.relations) {
      neighbors.get(edge.sourceNodeId)!.add(edge.targetNodeId);
      neighbors.get(edge.targetNodeId)!.add(edge.sourceNodeId);
    }
    const seen = new Set<string>();
    let components = 0;
    for (const id of snapshot.nodeIds) {
      if (seen.has(id)) continue;
      components++;
      const stack = [id];
      while (stack.length) {
        const current = stack.pop()!;
        if (seen.has(current)) continue;
        seen.add(current);
        for (const next of neighbors.get(current)!) if (!seen.has(next)) stack.push(next);
      }
    }
    return components;
  };
  const status: MihmTopologyContrast['status'] =
    addedNodes.length || removedNodes.length || addedRelations.length || removedRelations.length
      ? 'STRUCTURAL_CHANGE' : 'EQUIVALENT_WITHIN_PROTOCOL';
  return {
    ...base, status, missing: [],
    counts: {
      beforeNodes: before.nodeIds.length, afterNodes: after.nodeIds.length,
      beforeRelations: before.relations.length, afterRelations: after.relations.length,
      aggregatesEqual: before.nodeIds.length === after.nodeIds.length &&
        before.relations.length === after.relations.length,
    },
    delta: {
      addedNodes, removedNodes, addedRelations, removedRelations,
      weakComponentsBefore: weakComponents(before),
      weakComponentsAfter: weakComponents(after),
    },
  };
}
