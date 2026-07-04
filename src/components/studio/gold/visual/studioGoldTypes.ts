export type StudioGoldSystemState = 'nominal' | 'degraded' | 'critical' | 'offline';
export type StudioGoldTrend = 'up' | 'down' | 'stable';
export type StudioGoldIntensity = 'low' | 'medium' | 'high';
export type StudioGoldEngineState = 'active' | 'degraded' | 'standby' | 'blocked';

export type StudioGoldState = {
  generatedAt: string;
  systemState: StudioGoldSystemState;

  activeCase: {
    id: string | null;
    title: string;
    phase: string;
    progress: number;
    signals: number;
    activeDays: number;
    hypothesis: string;
  };

  keyObservables: Array<{
    id: string;
    label: string;
    value: number;
    trend?: StudioGoldTrend;
  }>;

  persistentSignals: Array<{
    id: string;
    label: string;
    intensity: StudioGoldIntensity;
    trend?: StudioGoldTrend;
  }>;

  culturalWave: {
    coherenceGlobal: number;
    culturalEntropy: number;
    symbolicDensity: number;
    plasticity: number;
    waveSpeed: number;
    analyticCoverage: number;
    points: Array<{ x: number; y: number; amplitude: number; density: number }>;
    markers: Array<{ x: number; label: string; kind: 'narrative' | 'friction' | 'opportunity' | 'synthesis' }>;
  };

  wsvLens: {
    economic: number;
    political: number;
    technological: number;
    cultural: number;
    ecological: number;
    global: number;
  };

  mihmModel: {
    individual: number;
    group: number;
    institutional: number;
    systemic: number;
    civilizational: number;
  };

  observablesMatrix: {
    symbolic: number;
    cognitive: number;
    affective: number;
    conductual: number;
    institutional: number;
    technological: number;
    totalObservables: number;
    activePercentage: number;
  };

  pmv: {
    id: string;
    intensity: string;
    hypothesis: string;
    reach: number;
    coverage: number;
    expectedImpact: number;
    state: 'draft' | 'ready' | 'running' | 'complete' | 'blocked';
    field: Array<{ angle: number; radius: number; intensity: number }>;
  };

  longitudinalTracking: Array<{
    id: string;
    label: string;
    value: number;
    series: number[];
  }>;

  synthesis: {
    researchNote: string;
    implication: string;
    nextAction: string;
    confidence: number;
  };

  engines: Array<{
    id: string;
    label: string;
    description: string;
    value: number;
    state: StudioGoldEngineState;
  }>;

  provenance: {
    basedOn: string[];
    degradedSources: string[];
    limits: string[];
  };
};
