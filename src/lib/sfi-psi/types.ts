export type SfiLabMode = 'detect_signals' | 'generate_report' | 'propose_campaign' | 'generate_assets';

export type SfiDataMode = 'deterministic_demo' | 'real_input' | 'provider_enriched';

export type SfiEvidenceStatus =
  | 'insufficient_longitudinal_data'
  | 'weak_signal'
  | 'persistent_signal'
  | 'emergent_node'
  | 'stable_regime';

export type SfiFileMetadata = {
  name?: string;
  type?: string;
  size?: number;
  lastModified?: number;
};

export type SfiEvent = {
  id: string;
  source: string;
  text: string;
  normalizedText: string;
  timestamp: string | null;
  tokens: string[];
  tags: string[];
  file?: SfiFileMetadata | null;
};

export type SfiReappearance = {
  id: string;
  eventIds: string[];
  pattern: string;
  normalizedPattern: string;
  recurrence: number;
  similarity: number;
  firstSeen: string | null;
  lastSeen: string | null;
  status: 'single_event_recurrence' | 'cross_event_recurrence' | 'semantic_echo';
};

export type SfiSignal = {
  id: string;
  name: string;
  reappearanceIds: string[];
  eventIds: string[];
  recurrence: number;
  coherence: number;
  visibility: number;
  status: SfiEvidenceStatus;
  summary: string;
};

export type SfiNode = {
  id: string;
  name: string;
  signalIds: string[];
  eventIds: string[];
  status: SfiEvidenceStatus;
  firstSeen: string | null;
  lastSeen: string | null;
  recurrence: number;
  temporalSpanHours: number | null;
  identityScore: number;
  persistence: number;
  coherence: number;
  friction: number;
  visibility: number;
  utility: number;
  sfiVector: SfiVector;
};

export type SfiRegime = {
  id: string;
  name: string;
  nodeIds: string[];
  status: SfiEvidenceStatus;
  stability: number;
  summary: string;
};

export type SfiVector = {
  P: number;
  C: number;
  D: number;
  F: number;
  A: number;
  R: number;
  V: number;
  H: number;
  E: number;
  U: number;
  T: number;
  X: number;
  SFI_CONFIRMATION_SCORE: number;
  SFI_AMBIGUOUS_PERSISTENCE_SCORE: number;
  variance: number;
  recurrence: number;
  collapseRisk: number;
  survivalStatus: number;
};

export type SfiHypothesis = {
  id: string;
  title: string;
  statement: string;
  confidence: number;
  status: SfiEvidenceStatus;
  linkedSignalIds: string[];
  linkedNodeIds: string[];
  nextObservationWindow: string;
};

export type SfiCampaignProposal = {
  id: string;
  title: string;
  audience: string;
  recommendedFormat: string;
  hypothesis: string;
  posts: string[];
  captions: string[];
  visualPrompts: string[];
  shortVideoScript: string;
  publicationProposal: string;
  hashtags: string[];
};

export type SfiMediaPlan = {
  id: string;
  imagePrompts: string[];
  videoPrompts: string[];
  audioDirection: string[];
  shotList: string[];
  publishPlan: string[];
  providerPriority: Array<'huggingface' | 'google' | 'local deterministic fallback'>;
  providerStatus: {
    huggingface: 'configured' | 'missing_key';
    google: 'configured' | 'missing_key';
    fallback: 'available';
  };
  renderEndpoint: '/api/sfi/media/render';
  placeholders: string[];
};

export type SfiReport = {
  analysisId: string;
  markdown: string;
  json: {
    executiveSummary: string;
    detectedReappearances: SfiReappearance[];
    weakSignals: SfiSignal[];
    persistentSignals: SfiSignal[];
    nodes: SfiNode[];
    hypotheses: SfiHypothesis[];
    recommendations: string[];
    campaign: SfiCampaignProposal;
    mediaPlan: SfiMediaPlan;
    limitations: string[];
    nextObservationWindow: string;
  };
};

export type SfiLabAnalysis = {
  ok: true;
  analysisId: string;
  createdAt: string;
  mode: SfiLabMode;
  source: string;
  dataMode: SfiDataMode;
  events: SfiEvent[];
  reappearances: SfiReappearance[];
  signals: SfiSignal[];
  nodes: SfiNode[];
  regimes: SfiRegime[];
  sfiVector: SfiVector;
  hypotheses: SfiHypothesis[];
  recommendations: string[];
  campaign: SfiCampaignProposal;
  mediaPlan: SfiMediaPlan;
  limitations: string[];
  nextObservationWindow: string;
};

export type SfiLabAnalyzeInput = {
  text?: string;
  file?: SfiFileMetadata | null;
  mode?: SfiLabMode | string;
  source?: string;
  tags?: string[];
};
