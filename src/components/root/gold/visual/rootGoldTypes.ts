export type RootGovernanceState = {
  generatedAt: string;
  systemState: 'nominal' | 'degraded' | 'critical' | 'offline';
  governanceSummary: {
    systemicFriction: number | null;
    coherence: number | null;
    resilience: number | null;
    alignment: number | null;
    activeNodes: number | null;
    coverage: number | null;
  };
  agents: Array<{
    id: string;
    role: string;
    health: number | null;
    state: 'active' | 'standby' | 'degraded' | 'blocked' | 'offline';
  }>;
  activeProposals: Array<{
    id: string;
    title: string;
    confidence: number | null;
    state: 'draft' | 'proposed' | 'accepted' | 'prepared' | 'executed' | 'blocked';
  }>;
  recentRecords: Array<{
    time: string;
    actor: string;
    label: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  governanceField: {
    center: { label: string; intensity: number };
    domains: Array<{ id: string; label: string; x: number; y: number; intensity: number }>;
    links: Array<{
      from: string;
      to: string;
      strength: number;
      kind: 'information' | 'society' | 'resources' | 'technology' | 'institutional' | 'environment';
    }>;
    particles: Array<{ x: number; y: number; intensity: number }>;
  };
  projections: {
    activeHypotheses: Array<{ id: string; label: string; probability: number | null }>;
    recentCalibrations: Array<{ id: string; label: string; completed: boolean; time: string }>;
  };
  proposedInvestigations: {
    title: string;
    scenarioId: string | null;
    state: 'idle' | 'running' | 'complete' | 'blocked';
    progress: number | null;
    wsvPreview?: { nodes: Array<{ lat: number; lon: number; value: number }> };
  };
  socialSimulationLab: {
    scenarioId: string | null;
    dimensions: number | null;
    resolution: 'baja' | 'media' | 'alta' | null;
    state: 'idle' | 'running' | 'complete' | 'blocked';
    progress: number | null;
    vectorPreview: Array<{ x: number; y: number; value: number }>;
  };
  atlas: {
    ingestion: Array<{ source: string; count: number | null; status: 'updated' | 'stale' | 'missing' | 'degraded' }>;
    globalCoverage: number | null;
    activeSources: number | null;
    mapNodes: Array<{ lat: number; lon: number; value: number }>;
  };
  executionTools: Array<{
    id: string;
    label: string;
    description: string;
    available: boolean;
    state: 'available' | 'running' | 'blocked' | 'degraded';
  }>;
  engines: Array<{
    id: string;
    label: string;
    description: string;
    value: number | null;
    state: 'active' | 'degraded' | 'standby' | 'blocked';
  }>;
  provenance: {
    basedOn: string[];
    degradedSources: string[];
    limits: string[];
  };
};

export type RootGovernanceViewMode = 'topologia' | 'flujo' | 'malla';
