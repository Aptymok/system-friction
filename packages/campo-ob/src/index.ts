export type SourceState = 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';

export type EvidenceLevel = 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';

export type FieldRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type FieldNode = {
  id: string;
  label: string;
  kind: string;
  status: 'active' | 'inactive' | 'degraded' | 'unknown';
};

export type FieldLink = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
  confidence: number;
};

export type FieldState = {
  fieldId: string;
  nodeId: string;
  regime: FieldRegime;
  operationalCapacity: number;
  degradation: number;
  nodes: FieldNode[];
  links: FieldLink[];
  sourceState: SourceState;
  evidenceLevel: EvidenceLevel;
  confidence: number;
  updatedAt: string;
};

export type NodeState = {
  nodeId: string;
  ownerId: string;
  assets: Array<{ assetId: string; status: string }>;
  updatedAt: string;
};

export type LogRecord = {
  id: string;
  nodeId: string;
  eventName: string;
  sourceState: SourceState;
  evidenceLevel: EvidenceLevel;
  payloadHash: string;
  createdAt: string;
};

export type SourceHealth = {
  sourceId: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastObservedAt?: string;
  message?: string;
};

