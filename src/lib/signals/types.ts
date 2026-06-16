export type SignalState = 'latent' | 'emerging' | 'crystallizing' | 'consolidated' | 'degraded';

export type SignalModality = 'text' | 'image' | 'audio' | 'video' | 'event' | 'mixed' | 'unknown';

export type PersistentSignal = {
  id: string;
  signal_hash: string;
  label: string | null;
  description: string | null;
  scope: string;
  state: SignalState;
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  modalities: SignalModality[];
  persistence_score: number;
  cross_modal_score: number;
  drift_score: number;
  entropy_score: number;
  mihm_snapshot: unknown | null;
  worldspect_snapshot: unknown | null;
  supporting_vectors: unknown[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SignalManifestation = {
  id: string;
  signal_id: string;
  source_type: string;
  source_id: string | null;
  modality: SignalModality;
  content_hash: string | null;
  embedding: unknown | null;
  similarity: number;
  observed_at: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ManifestSignalInput = {
  label?: string;
  description?: string;
  scope?: string;
  source_type: string;
  source_id?: string;
  modality?: SignalModality;
  content?: string;
  content_hash?: string;
  embedding?: unknown;
  similarity?: number;
  payload?: Record<string, unknown>;
  mihm_snapshot?: unknown;
  worldspect_snapshot?: unknown;
  supporting_vectors?: unknown[];
};

export type PersistentSignalState = {
  ok: true;
  signals: PersistentSignal[];
  crystallizing: PersistentSignal[];
  degraded: PersistentSignal[];
  recentManifestations: SignalManifestation[];
  fieldSummary: {
    totalSignals: number;
    latentCount: number;
    emergingCount: number;
    crystallizingCount: number;
    consolidatedCount: number;
    degradedCount: number;
    averagePersistence: number;
    averageCrossModal: number;
    strongestSignal: PersistentSignal | null;
    weakestSignal: PersistentSignal | null;
    dominantModalities: Array<{ modality: SignalModality; count: number }>;
  };
};
