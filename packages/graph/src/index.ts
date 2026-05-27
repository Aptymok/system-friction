export type GraphNodeRecord = {
  nodeId: string;
  label: string;
  ontologyType: string;
  lineage: string[];
  profile?: GraphProfile;
  origin?: string;
  provenance?: string;
  attributes?: Record<string, unknown>;
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
  profile?: GraphProfile;
  origin?: string;
  provenance?: string;
  attributes?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GraphProfile = 'sfi' | 'cognitive_twin' | 'shared';

export type CanonicalGraphNode = {
  nodeId: string;
  label: string;
  ontologyType: string;
  profile: GraphProfile;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalGraphEdge = {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  weight: number;
  profile: GraphProfile;
  origin: string;
  provenance: string;
  lineage: string[];
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalGraphState = {
  profile: GraphProfile;
  sourceState: 'observed' | 'degraded' | 'missing';
  degradedReason: string | null;
  nodes: CanonicalGraphNode[];
  edges: CanonicalGraphEdge[];
  schemas: {
    node: Record<string, unknown>;
    edge: Record<string, unknown>;
  };
  loadedAt: string;
};

export const graphNodeJsonSchema = {
  type: 'object',
  required: ['nodeId', 'label', 'ontologyType', 'profile', 'origin', 'provenance'],
  properties: {
    nodeId: { type: 'string' },
    label: { type: 'string' },
    ontologyType: { type: 'string' },
    profile: { enum: ['sfi', 'cognitive_twin', 'shared'] },
    origin: { type: 'string' },
    provenance: { type: 'string' },
    lineage: { type: 'array', items: { type: 'string' } },
    attributes: { type: 'object' },
  },
} as const;

export const graphEdgeJsonSchema = {
  type: 'object',
  required: ['edgeId', 'sourceNodeId', 'targetNodeId', 'relation', 'weight', 'profile', 'origin', 'provenance'],
  properties: {
    edgeId: { type: 'string' },
    sourceNodeId: { type: 'string' },
    targetNodeId: { type: 'string' },
    relation: { type: 'string' },
    weight: { type: 'number', minimum: 0, maximum: 1 },
    profile: { enum: ['sfi', 'cognitive_twin', 'shared'] },
    origin: { type: 'string' },
    provenance: { type: 'string' },
    lineage: { type: 'array', items: { type: 'string' } },
    attributes: { type: 'object' },
  },
} as const;

export function canonicalGraphNode(input: Partial<GraphNodeRecord> & { nodeId: string }): GraphNodeRecord {
  const now = new Date().toISOString();
  return {
    nodeId: input.nodeId,
    label: input.label ?? input.nodeId,
    ontologyType: input.ontologyType ?? 'unknown',
    lineage: Array.isArray(input.lineage) ? input.lineage : [],
    profile: input.profile ?? 'shared',
    origin: input.origin ?? 'unknown',
    provenance: input.provenance ?? 'unknown',
    attributes: input.attributes ?? {},
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
    profile: input.profile ?? 'shared',
    origin: input.origin ?? 'unknown',
    provenance: input.provenance ?? 'unknown',
    attributes: input.attributes ?? {},
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function isGraphProfile(value: unknown): value is GraphProfile {
  return value === 'sfi' || value === 'cognitive_twin' || value === 'shared';
}
