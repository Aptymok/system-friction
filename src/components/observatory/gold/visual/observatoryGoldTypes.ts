export type ObservatoryGoldSystemState = 'nominal' | 'degraded' | 'critical' | 'offline';
export type ObservatoryGoldDomain = 'tec' | 'geo' | 'eco' | 'soc' | 'pol' | 'bio' | 'clima' | 'cultural';
export type ObservatoryGoldTrend = 'up' | 'down' | 'stable';

export type ObservatoryLongitudinalPoint = {
  observedAt: string;
  wsi: number | null;
  nti: number | null;
  confidence: number | null;
  sourceState: string;
  ingestMode: string;
};

export type ObservatoryTemporalFrame = {
  observedAt: string;
  wsi: number | null;
  nti: number | null;
  confidence: number | null;
  sourceState: string;
  ingestMode: string;
  vectors: Array<{
    id: string;
    label: string;
    value: number | null;
    sourceCount: number;
    trust: number | null;
  }>;
};

export type ObservatoryPublicSourceObservation = {
  ref: string;
  key: string;
  label: string | null;
  domain: string;
  provider: string | null;
  value: number;
  unit: string | null;
  nti: number | null;
  weight: number | null;
  observedAt: string;
};

export type ObservatoryVectorReconstructibility = {
  vectorId: string;
  state: 'RECONSTRUCTIBLE_TO_NORMALIZED_SOURCE' | 'EVIDENCE_NOT_PUBLICLY_RECONSTRUCTIBLE';
  derivation: 'ARITHMETIC_MEAN_OF_NORMALIZED_USABLE_SOURCES';
  publishedValue: number;
  reconstructedValue: number | null;
  tolerance: number;
  matchesPublishedValue: boolean | null;
  declaredSourceCount: number;
  publicSourceCount: number;
  observations: ObservatoryPublicSourceObservation[];
  upstreamRawState: 'NOT_PUBLICLY_EXPOSED';
  limitations: string[];
};

export type ObservatoryGoldState = {
  generatedAt: string;
  systemState: ObservatoryGoldSystemState;

  publicContract: {
    scope: 'PUBLIC';
    institution: 'SYSTEM FRICTION INSTITUTE';
    horizonDays: number;
    sourceState: string;
    observedAt: string | null;
  };

  wsv: {
    globalIndex: number;
    coherence: number;
    resilience: number;
    alignment: number;
    tension: number;
    regime: string;
  };

  longitudinal: {
    horizonDays: number;
    sampleCount: number;
    firstObservedAt: string | null;
    lastObservedAt: string | null;
    points: ObservatoryLongitudinalPoint[];
    deltas: {
      wsi: number | null;
      nti: number | null;
      confidence: number | null;
    };
  };

  temporalFrames?: ObservatoryTemporalFrame[];

  reconstructibility?: {
    contract: 'SFI-PUBLIC-WORLD-RECONSTRUCTIBILITY-1.0';
    state: 'PARTIAL' | 'EVIDENCE_NOT_PUBLICLY_RECONSTRUCTIBLE';
    sourceSnapshotObservedAt: string | null;
    vectors: ObservatoryVectorReconstructibility[];
    limitations: string[];
  };

  explanation: {
    title: string;
    body: string;
    methodologyAvailable: boolean;
  };

  highlightedSignals: Array<{
    time: string;
    label: string;
    domain: ObservatoryGoldDomain;
    intensity: number;
  }>;

  globalMap: {
    tensionIntensityMin: number;
    tensionIntensityMax: number;
    nodes: Array<{
      id: string;
      label: string;
      lat: number;
      lon: number;
      intensity: number;
      domain: string;
    }>;
    flows: Array<{
      fromLat: number;
      fromLon: number;
      toLat: number;
      toLon: number;
      intensity: number;
      domain: string;
    }>;
  };

  dailyReading: {
    date: string;
    title: string;
    summary: string;
    tensionIndex: number;
    stability: 'alta' | 'media' | 'baja' | 'crítica';
    fullReadingUrl?: string | null;
    institution: 'SYSTEM FRICTION INSTITUTE';
    byline: string;
    confidence: number | null;
    sourceState: string;
    evidenceCount: number;
    evidence: string[];
    limits: string[];
  };

  vectors: Array<{
    id: string;
    label: string;
    domainKeys: string[];
    active: boolean;
    value: number;
    persistence: number | null;
    volatility: number | null;
    trust: number | null;
    confidence: number | null;
    sourceCount: number;
    observedAt: string | null;
    sourceState: string;
    delta: number | null;
    trend: ObservatoryGoldTrend | 'unavailable';
  }>;

  worldTensions: Array<{
    rank: number;
    label: string;
    value: number;
    domain: string;
  }>;

  regionalTensions: Array<{
    region: string;
    value: number;
    trend?: ObservatoryGoldTrend;
  }>;

  mapFilters: {
    minimumIntensity: number;
    tensionType: string;
    region: string;
  };

  timeline: Array<{
    time: string;
    title: string;
    description: string;
    active?: boolean;
  }>;

  provenance: {
    basedOn: string[];
    degradedSources: string[];
    limits: string[];
  };
};