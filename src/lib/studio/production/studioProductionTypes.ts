import type { StudioCulturalLens, StudioHypothesisReport } from './hypothesisEngine';

export type StudioProductionSystemState = 'nominal' | 'degraded' | 'critical' | 'offline';
export type StudioObjectType = 'music' | 'video' | 'image' | 'text' | 'community' | 'time_coordinate' | 'unknown';
export type StudioJobState = 'idle' | 'queued' | 'running' | 'complete' | 'blocked' | 'failed';
export type StudioReadinessState = 'ready' | 'partial' | 'blocked' | 'missing';

export type StudioProductionSession = {
  id: string | null;
  title: string;
  status: 'active' | 'archived' | 'draft' | 'blocked';
  createdAt: string | null;
  updatedAt: string | null;
};

export type StudioProductionObject = {
  id: string | null;
  sessionId: string | null;
  title: string;
  type: StudioObjectType;
  sourceUri: string | null;
  mimeType: string | null;
  status: StudioJobState;
  readiness: StudioReadinessState;
  uploadedAt: string | null;
};

export type StudioFeatureMetric = {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  source: string;
  status: StudioReadinessState;
};

export type StudioFeaturePoint = {
  x: number;
  y: number;
  value: number;
  layer: string;
};

export type StudioObjectFeatures = {
  modality: StudioObjectType;
  readiness: StudioReadinessState;
  metrics: StudioFeatureMetric[];
  layers: Array<{
    id: string;
    label: string;
    kind: string;
    weight: number | null;
    status: StudioReadinessState;
  }>;
  graph: {
    nodes: Array<{ id: string; label: string; layer: string; value: number | null }>;
    edges: Array<{ from: string; to: string; weight: number | null; source: string }>;
  };
};

export type StudioAudioFeatures = {
  waveform: number[];
  rms: number | null;
  peak: number | null;
  clippingRisk: number | null;
  dynamicRange: number | null;
  lufs: number | null;
  spectralCentroid: number | null;
  frequencyBands: number[];
  stereoImage: number | null;
  silenceStartSeconds: number | null;
  silenceEndSeconds: number | null;
  energySegments: number[];
  stemCorrelation: Array<{ a: string; b: string; value: number | null }>;
};

export type StudioVideoFeatures = {
  shots: number | null;
  scenes: number | null;
  motionIntensity: number | null;
  transitionRhythm: number | null;
  visualMotifs: string[];
};

export type StudioImageFeatures = {
  dominantColors: string[];
  textureDensity: number | null;
  visualEntropy: number | null;
  spatialBalance: number | null;
  symbolicTags: string[];
};

export type StudioTextFeatures = {
  tokens: number | null;
  sections: number | null;
  themes: string[];
  motifs: string[];
  sentimentArousal: number | null;
  narrativeArc: number[];
  semanticDensity: number | null;
  symbolicRecurrence: number | null;
};

export type StudioCommunityFeatures = {
  participantCount: number | null;
  messageDensity: number | null;
  topicClusters: string[];
  affectiveTone: number | null;
  recurrence: number | null;
  coherence: number | null;
  friction: number | null;
};

export type StudioTimeCoordinateFeatures = {
  timeRange: string | null;
  placeLabel: string | null;
  semanticAnchors: string[];
  historicalVectorTags: string[];
  dominantTensions: string[];
  gapDescription: string | null;
};

export type StudioIntervention = {
  id: string;
  title: string;
  state: StudioJobState;
  scope: 'overview' | 'composition' | 'sound' | 'arrangement' | 'mix' | 'master' | 'graph' | 'archive';
  expectedImpact: number | null;
  risk: number | null;
  source: string;
};

export type StudioArchiveState = {
  events: Array<{ id: string; time: string; label: string; source: string }>;
  evidenceTraceCount: number | null;
  integrity: StudioReadinessState;
};

export type StudioExportState = {
  packages: Array<{ id: string; label: string; state: StudioJobState; url: string | null }>;
  signoffReadiness: StudioReadinessState;
};

export type StudioProductionState = {
  generatedAt: string;
  systemState: StudioProductionSystemState;
  session: StudioProductionSession;
  activeObject: StudioProductionObject;
  objectFeatures: StudioObjectFeatures;
  audioFeatures: StudioAudioFeatures;
  videoFeatures: StudioVideoFeatures;
  imageFeatures: StudioImageFeatures;
  textFeatures: StudioTextFeatures;
  communityFeatures: StudioCommunityFeatures;
  timeCoordinateFeatures: StudioTimeCoordinateFeatures;
  culturalLens: StudioCulturalLens | null;
  mihmReport: {
    score: number | null;
    individual: number | null;
    group: number | null;
    institutional: number | null;
    systemic: number | null;
    civilizational: number | null;
    source: string;
  };
  hypotheses: StudioHypothesisReport | null;
  interventions: StudioIntervention[];
  archive: StudioArchiveState;
  exports: StudioExportState;
  provenance: {
    basedOn: string[];
    derivedFrom: string[];
    limits: string[];
  };
  degradedSources: string[];
};
