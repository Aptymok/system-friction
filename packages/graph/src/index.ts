export type GraphNodeRecord = {
  nodeId: string;
  label: string;
  ontologyType: string;
  lineage: string[];
  createdAt: string;
  updatedAt: string;
};

export type GraphEdgeRecord = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  weight: number;
  lineage: string[];
  createdAt: string;
  updatedAt: string;
};

export function canonicalGraphNode(input: Partial<GraphNodeRecord> & { nodeId: string }): GraphNodeRecord {
  const now = new Date().toISOString();
  return {
    nodeId: input.nodeId,
    label: input.label ?? input.nodeId,
    ontologyType: input.ontologyType ?? 'unknown',
    lineage: Array.isArray(input.lineage) ? input.lineage : [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function canonicalGraphEdge(input: Partial<GraphEdgeRecord> & { edgeId: string; sourceNodeId: string; targetNodeId: string }): GraphEdgeRecord {
  const now = new Date().toISOString();
  return {
    edgeId: input.edgeId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    relation: input.relation ?? 'related_to',
    weight: Math.max(0, Math.min(1, Number(input.weight ?? 0))),
    lineage: Array.isArray(input.lineage) ? input.lineage : [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}
