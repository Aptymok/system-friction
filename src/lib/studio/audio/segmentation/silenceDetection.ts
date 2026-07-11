import type { EnergySegment } from '../audioTypes';
import { amplitudeToDbfs } from '../features/basicFeatures';
import type { StudioAudioMarker, StudioAudioSegmentationOptions } from './segmentationTypes';

export function detectSilenceRegions(segments: EnergySegment[], options: StudioAudioSegmentationOptions = {}): StudioAudioMarker[] {
  const threshold = options.silenceThresholdDbfs ?? -60;
  const minimumSeconds = options.minimumSilenceSeconds ?? 0.25;
  const regions: StudioAudioMarker[] = [];
  let current: { start: number; end: number } | null = null;

  for (const segment of segments) {
    const isSilent = amplitudeToDbfs(segment.rms) <= threshold;
    if (isSilent && !current) current = { start: segment.startSeconds, end: segment.endSeconds };
    else if (isSilent && current) current.end = segment.endSeconds;
    else if (!isSilent && current) {
      if (current.end - current.start >= minimumSeconds) {
        regions.push({
          id: `silence-${regions.length + 1}`,
          type: 'silence',
          label: 'Silence',
          startSeconds: current.start,
          endSeconds: current.end,
          confidence: 0.7,
          payload: { thresholdDbfs: threshold },
        });
      }
      current = null;
    }
  }

  if (current && current.end - current.start >= minimumSeconds) {
    regions.push({
      id: `silence-${regions.length + 1}`,
      type: 'silence',
      label: 'Silence',
      startSeconds: current.start,
      endSeconds: current.end,
      confidence: 0.7,
      payload: { thresholdDbfs: threshold },
    });
  }

  return regions;
}
