export type ObservatoryGoldSystemState = 'nominal' | 'degraded' | 'critical' | 'offline';
export type ObservatoryGoldDomain = 'tec' | 'geo' | 'eco' | 'soc' | 'pol' | 'bio' | 'clima' | 'cultural';
export type ObservatoryGoldTrend = 'up' | 'down' | 'stable';

export type ObservatoryGoldState = {
  generatedAt: string;
  systemState: ObservatoryGoldSystemState;

  wsv: {
    globalIndex: number;
    coherence: number;
    resilience: number;
    alignment: number;
    tension: number;
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
  };

  vectors: Array<{
    id: string;
    label: string;
    active: boolean;
    value: number;
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
