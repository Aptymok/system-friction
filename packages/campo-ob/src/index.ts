export type SourceState = 'observed' | 'declared' | 'derived' | 'inferred' | 'simulated' | 'fixture' | 'missing';

export type EvidenceLevel = 'direct' | 'behavioral' | 'statistical' | 'semantic' | 'speculative' | 'none';

const sourceStates: SourceState[] = ['observed', 'declared', 'derived', 'inferred', 'simulated', 'fixture', 'missing'];

const evidenceLevels: EvidenceLevel[] = ['direct', 'behavioral', 'statistical', 'semantic', 'speculative', 'none'];

export function isSourceState(value: unknown): value is SourceState {
  return typeof value === 'string' && sourceStates.includes(value as SourceState);
}

export function isEvidenceLevel(value: unknown): value is EvidenceLevel {
  return typeof value === 'string' && evidenceLevels.includes(value as EvidenceLevel);
}

export function isCanonicalConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

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

export type CampoNodeType =
  | 'BIO'
  | 'ECO'
  | 'ECON'
  | 'INST'
  | 'DIG'
  | 'ALG'
  | 'AGT'
  | 'CYB'
  | 'CULT'
  | 'ENE'
  | 'INF'
  | 'PERC';

export type CampoWorldSpectSource = {
  key: string;
  value: number | null;
  nti?: number;
  weight?: number;
  mihm_var?: string;
  simulated?: boolean;
  error?: string;
};

export type CampoWorldSpectSnapshot = {
  sourceState: 'observed' | 'degraded' | 'missing';
  evidenceLevel: 'direct' | 'none';
  confidence: number;
  wsi: number | null;
  nti: number | null;
  ts: string;
  sources: CampoWorldSpectSource[];
  degraded_sources: string[];
  snapshot?: {
    id?: string;
    snapshotHash?: string;
    observedAt?: string;
  };
};

export type CampoObNode = {
  id: string;
  type: CampoNodeType;
  sourceKey: string;
  weight: number;
  value: number | null;
  nti: number | null;
  simulated: boolean;
  ontologyDistance: number;
};

export type CampoObState = {
  snapshotHashInput: string;
  observedAt: string;
  sourceState: 'observed' | 'degraded' | 'missing';
  confidence: number;
  nodes: CampoObNode[];
  aggregateWeights: Record<CampoNodeType, number>;
};

const sourceTypeRules: Array<[string, CampoNodeType]> = [
  ['energy', 'ENE'],
  ['climate', 'ECO'],
  ['ecology', 'ECO'],
  ['market', 'ECON'],
  ['econom', 'ECON'],
  ['institution', 'INST'],
  ['govern', 'INST'],
  ['digital', 'DIG'],
  ['cyber', 'CYB'],
  ['algorithm', 'ALG'],
  ['agent', 'AGT'],
  ['culture', 'CULT'],
  ['media', 'INF'],
  ['news', 'INF'],
  ['perception', 'PERC'],
  ['health', 'BIO'],
  ['bio', 'BIO'],
];

const initialWeights: Record<CampoNodeType, number> = {
  BIO: 0.08,
  ECO: 0.1,
  ECON: 0.1,
  INST: 0.12,
  DIG: 0.08,
  ALG: 0.08,
  AGT: 0.07,
  CYB: 0.07,
  CULT: 0.08,
  ENE: 0.08,
  INF: 0.09,
  PERC: 0.05,
};

function nodeTypeForSource(source: CampoWorldSpectSource): CampoNodeType {
  const key = `${source.key} ${source.mihm_var ?? ''}`.toLowerCase();
  return sourceTypeRules.find(([needle]) => key.includes(needle))?.[1] ?? 'INF';
}

function clampWeight(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

export function mapWorldSpectToCampo(snapshot: CampoWorldSpectSnapshot): CampoObState {
  const nodes = snapshot.sources.map((source) => {
    const type = nodeTypeForSource(source);
    const degraded = snapshot.degraded_sources.includes(source.key) || Boolean(source.error) || source.simulated === true;
    const baseWeight = clampWeight(source.weight, initialWeights[type]);

    return {
      id: `worldspect:${source.key}`,
      type,
      sourceKey: source.key,
      weight: degraded ? Number((baseWeight * 0.5).toFixed(4)) : baseWeight,
      value: source.value,
      nti: typeof source.nti === 'number' && Number.isFinite(source.nti) ? source.nti : null,
      simulated: source.simulated === true,
      ontologyDistance: 0,
    };
  });

  const aggregateWeights = Object.keys(initialWeights).reduce<Record<CampoNodeType, number>>((acc, key) => {
    const type = key as CampoNodeType;
    acc[type] = Number(nodes.filter((node) => node.type === type).reduce((sum, node) => sum + node.weight, 0).toFixed(4));
    return acc;
  }, {} as Record<CampoNodeType, number>);

  return {
    snapshotHashInput: JSON.stringify({
      sourceState: snapshot.sourceState,
      confidence: snapshot.confidence,
      wsi: snapshot.wsi,
      nti: snapshot.nti,
      ts: snapshot.ts,
      sources: snapshot.sources.map((source) => source.key).sort(),
    }),
    observedAt: snapshot.ts,
    sourceState: snapshot.sourceState,
    confidence: snapshot.confidence,
    nodes,
    aggregateWeights,
  };
}
