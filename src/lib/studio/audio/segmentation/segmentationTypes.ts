export type StudioAudioSegmentationOptions = {
  silenceThresholdDbfs?: number;
  minimumSilenceSeconds?: number;
  waveformPointCount?: number;
};

export type StudioAudioMarker = {
  id: string;
  type: 'silence' | 'active' | 'onset' | 'section';
  label: string;
  startSeconds: number;
  endSeconds: number;
  confidence: number;
  payload?: Record<string, unknown>;
};
