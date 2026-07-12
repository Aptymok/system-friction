import type { MetricStatus } from '@/lib/studio/production/studioProductionTypes';

export const STUDIO_AUDIO_ENGINE_NAME = 'studio_audio_ffmpeg_pcm_feature_engine';
export const STUDIO_AUDIO_ENGINE_VERSION = '2026-07-11.2';
export const STUDIO_AUDIO_BUCKET = 'studio-objects';
export const STUDIO_AUDIO_DBFS_FLOOR = -120;

export type StudioAudioErrorCode =
  | 'AUTH_REQUIRED'
  | 'OBJECT_NOT_FOUND'
  | 'OBJECT_NOT_AUDIO'
  | 'UPLOAD_NOT_FOUND'
  | 'STORAGE_DOWNLOAD_FAILED'
  | 'FILE_TOO_LARGE'
  | 'DURATION_TOO_LONG'
  | 'INVALID_AUDIO_CONTAINER'
  | 'UNSUPPORTED_CODEC'
  | 'DECODE_FAILED'
  | 'PERSISTENCE_FAILED'
  | 'ANALYSIS_FAILED';

export type StudioAudioAnalysisOptions = {
  force?: boolean;
  maxFileBytes?: number;
  maxDurationSeconds?: number;
  requestedByUserId?: string | null;
};

export type StudioAudioObjectRow = {
  id: string;
  session_id: string | null;
  title: string | null;
  object_type: string | null;
  source_uri: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StudioAudioUploadRow = {
  id: string;
  object_id: string;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string | null;
  created_at: string | null;
};

export type StudioStoredAudio = {
  object: StudioAudioObjectRow;
  upload: StudioAudioUploadRow;
  bytes: Buffer;
  byteLength: number;
  checksumSha256: string;
};

export type StudioAudioProbe = {
  container: 'wav';
  codec: string;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  byteRate: number;
  blockAlign: number;
  durationSeconds: number;
  dataOffset: number;
  dataLength: number;
};

export type StudioDecodedAudio = StudioAudioProbe & {
  channelData: Float32Array[];
  frameCount: number;
  durationSeconds: number;
};

export type StudioAudioFeature = {
  key: string;
  label: string;
  value: number | string | null;
  unit: string | null;
  status: MetricStatus;
  source: string;
  confidence: number;
  formulaVersion: string;
  explanation: string;
  warnings: string[];
  payload?: Record<string, unknown>;
};

export type WaveformPeak = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  min: number;
  max: number;
  rms: number;
};

export type EnergySegment = {
  index: number;
  startSeconds: number;
  endSeconds: number;
  rms: number;
  peak: number;
  centroidHz: number | null;
};

export type TimeRegion = {
  id: string;
  type: 'silence' | 'active' | 'onset' | 'section';
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  label: string;
  payload?: Record<string, unknown>;
};

export type StudioAudioAnalysisResult = {
  objectId: string;
  jobId: string;
  idempotencyKey: string;
  engine: string;
  engineVersion: string;
  checksumSha256: string;
  probe: StudioAudioProbe;
  features: StudioAudioFeature[];
  waveform: WaveformPeak[];
  energySegments: EnergySegment[];
  timeRegions: TimeRegion[];
  warnings: string[];
  status: 'COMPLETE' | 'DEGRADED';
};
