export type StudioArtifactKind =
  | 'song'
  | 'album'
  | 'podcast'
  | 'article'
  | 'book'
  | 'video'
  | 'campaign'
  | 'speech'
  | 'research'
  | 'policy_document'
  | 'other';

export type StudioStageId =
  | 'input_archaeology'
  | 'mihm_deep_evaluation'
  | 'world_spectrum_comparison'
  | 'emergence_identification'
  | 'projection_registry'
  | 'intervention_design'
  | 'simulation_engine'
  | 'implementation_console'
  | 'outcome_forecast';

export type StudioStageStatus = 'idle' | 'running' | 'complete' | 'error';
export type StudioStageMode = 'local_heuristic' | 'scorefriction' | 'worldspect' | 'simulation' | 'manual';

export type StudioArtifactInput = {
  kind: StudioArtifactKind;
  title: string;
  author?: string;
  sourceUrl?: string;
  text?: string;
  notes?: string;
  targetAudience?: string;
  desiredShift?: string;
  constraints?: string[];
  createdAt?: string;
};

export type CulturalArtifactInput = StudioArtifactInput;

export type StudioStageResult<T = unknown> = {
  id: StudioStageId;
  label: string;
  status: StudioStageStatus;
  mode: StudioStageMode;
  inputRefs: string[];
  outputRefs: string[];
  explanation: string;
  confidence: number | null;
  data: T;
  basedOn: string[];
  why: string[];
  whatIf: string[];
  thenWhat: string[];
  how: string[];
  limits: string[];
};

export type StudioPipelineTrace = {
  runId: string;
  artifactId: string;
  createdAt: string;
  sourceOrigin: 'manual_input' | 'connector' | 'uploaded_file';
  stages: StudioStageResult[];
  warnings: string[];
};

export type InputArchaeologyResult = {
  symbolicStructures: Array<{ item: string; origin: string; basedOn: string[] }>;
  narratives: Array<{ item: string; origin: string; basedOn: string[] }>;
  emotionalStructures: Array<{ item: string; origin: string; basedOn: string[] }>;
  archetypes: Array<{ item: string; origin: string; basedOn: string[] }>;
  contradictions: Array<{ item: string; origin: string; basedOn: string[] }>;
  socialTensions: Array<{ item: string; origin: string; basedOn: string[] }>;
};

export type MihmDeepElement = {
  id: string;
  label: string;
  score: number;
  vector: Record<string, number>;
  explanation: string;
  evidence: string[];
};

export type WorldSpectrumPlacement = {
  artifactPoint: { x: number; y: number; z: number; label: string };
  nearbyArtifacts: string[];
  opposingArtifacts: string[];
  clusterMemberships: string[];
  culturalDrift: number;
  vectorTensions: string[];
};

export type EmergentHypothesis = {
  id: string;
  title: string;
  probability: number;
  drivers: string[];
  trace: string[];
};

export type ProjectionScenario = {
  id: 'A' | 'B' | 'C' | string;
  title: string;
  probability: number;
  confidence: number;
  drivers: string[];
  affectedVectors: Record<string, number>;
  narrative: string;
  trace: string[];
};

export type InterventionCandidate = {
  id: string;
  type: 'lyrical' | 'narrative' | 'structural' | 'symbolic' | 'production' | 'policy' | 'distribution';
  minimalChange: string;
  expectedVectorShift: Record<string, number>;
  risk: 'low' | 'medium' | 'high';
  evidenceRequired: string[];
  reversible: boolean;
};

export type ImplementationTargetValues = {
  summary: string;
  targetValues: Record<string, number>;
  operationalSteps: string[];
  requiredEvidence: string[];
  guardrails: string[];
};

export type StudioSimulationResult = {
  scenarios: ProjectionScenario[];
  interventions: InterventionCandidate[];
  forecast: Record<string, number>;
  risks: string[];
};
