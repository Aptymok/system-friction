export type SourceState = 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';

export type EvidenceLevel = 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';

export type FieldRegime = 'stable' | 'watch' | 'critical' | 'unknown';

export type LogbookId = string;

export type FieldMetricSet = {
  ihg: number;
  nti: number;
  ldi: number;
  phi?: number;
  degradation: number;
  operationalCapacity: number;
};

export type CanonicalEvidence = {
  sourceState: SourceState;
  evidenceLevel: EvidenceLevel;
  confidence: number;
  updatedAt: string;
};

export type FieldNode = {
  id: string;
  label: string;
  kind: string;
  status: 'active' | 'inactive' | 'degraded' | 'unknown';
} & CanonicalEvidence;

export type FieldLink = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: string;
} & CanonicalEvidence;

export type FieldState = CanonicalEvidence & {
  fieldId: string;
  nodeId: string;
  regime: FieldRegime;
  metrics: FieldMetricSet;
  operationalCapacity: number;
  degradation: number;
  nodes: FieldNode[];
  links: FieldLink[];
};

export type NodeState = CanonicalEvidence & {
  nodeId: string;
  ownerId: string;
  assets: Array<{ assetId: string; status: string }>;
};

export type LogRecord = CanonicalEvidence & {
  id: string;
  nodeId: string;
  logbookId?: LogbookId;
  eventName: string;
  payloadHash: string;
  createdAt: string;
};

export type SourceHealth = CanonicalEvidence & {
  sourceId: string;
  status: 'healthy' | 'degraded' | 'unavailable' | 'unknown';
  lastObservedAt?: string;
  message?: string;
};
