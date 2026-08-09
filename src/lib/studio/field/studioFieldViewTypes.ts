export type StudioFieldViewAttractor = {
  id: string;
  label: string;
  method: 'MOP-H';
  declaredAt: string;
  description: string | null;
};

export type StudioFieldViewNode = {
  id: string;
  kind: 'project' | 'node';
  label: string;
  description: string | null;
  parentId: string | null;
  x: number | null;
  y: number | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type StudioFieldViewEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: 'CONTAINS' | 'DERIVED_FROM' | 'INFLUENCES' | 'PROJECTS';
  createdAt: string;
};

export type StudioFieldViewObject = {
  id: string;
  title: string;
  objectType: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  fieldNodeId: string | null;
  modality: string | null;
  sourceRetention: string | null;
};

export type StudioFieldViewTimelineEvent = {
  id: string;
  at: string;
  type: string;
  label: string;
  source: string;
  objectId: string | null;
  nodeId: string | null;
};

export type StudioFieldViewState = {
  generatedAt: string;
  session: null | { id: string; title: string; status: string; createdAt: string | null; updatedAt: string | null };
  field: {
    version: 'STUDIO_FIELD_V1';
    attractor: StudioFieldViewAttractor | null;
    nodes: StudioFieldViewNode[];
    edges: StudioFieldViewEdge[];
  };
  objects: StudioFieldViewObject[];
  timeline: StudioFieldViewTimelineEvent[];
  world: null | {
    observed_at: string | null;
    sector: string;
    day_of_week: string;
    source_snapshot_id: string | null;
    domain_values: Array<{ domain: string; value: number | null; confidence: number | null; source_count: number }>;
    dominant_sources: Array<{ key: string; label: string; domain: string; value: number | null; confidence: number | null }>;
    dominant_signal: string | null;
    interpretation: string;
    confidence: number;
    status: string;
    warnings: string[];
    visual: { visualTension: number | null; mean: number | null; dispersion: number | null; formula: string; epistemicClass: 'DERIVED_DISPLAY_ONLY' };
  };
  providers: Array<{ id: string; available: boolean; model: string; role: string; configuredBy: string[] }>;
  twin: { contractVersion: string; memoryCount: number; approvedDecisionCount: number; warnings: string[] };
  agents: null | {
    counts: Record<string, number>;
    passports: Array<{ id: string; name: string; lifecycle: string; executorBound: boolean; latestExecutionAt: string | null }>;
  };
  ejector: Record<string, unknown> | null;
  warnings: string[];
};
