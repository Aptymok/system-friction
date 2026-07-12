import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import { feature, missingFeature, rms } from './basicFeatures';

export function extractStereoFeatures(decoded: StudioDecodedAudio): StudioAudioFeature[] {
  if (decoded.channels < 2) {
    return [
      missingFeature('stereo_width', 'Stereo Width', 'Stereo width requires at least two decoded channels.', ['STEREO_SOURCE_REQUIRED']),
      missingFeature('phase_correlation', 'Phase Correlation', 'Phase correlation requires at least two decoded channels.', ['STEREO_SOURCE_REQUIRED']),
    ];
  }

  const left = decoded.channelData[0];
  const right = decoded.channelData[1];
  let dot = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  const mid = new Float32Array(decoded.frameCount);
  const side = new Float32Array(decoded.frameCount);

  for (let index = 0; index < decoded.frameCount; index += 1) {
    const l = left[index] ?? 0;
    const r = right[index] ?? 0;
    dot += l * r;
    leftEnergy += l * l;
    rightEnergy += r * r;
    mid[index] = (l + r) / 2;
    side[index] = (l - r) / 2;
  }

  const correlation = dot / Math.sqrt(Math.max(1e-12, leftEnergy * rightEnergy));
  const midRms = rms(mid);
  const sideRms = rms(side);
  const width = sideRms / Math.max(1e-9, midRms + sideRms);

  return [
    feature('stereo_width', 'Stereo Width', width, null, 'Mid-side ratio measured from the first two decoded channels.', 0.76),
    feature('phase_correlation', 'Phase Correlation', correlation, null, 'Pearson-style sample correlation between first two decoded channels.', 0.76),
    feature('mid_energy', 'Mid Energy', midRms, null, 'RMS of mid channel derived from first two decoded channels.', 0.72),
    feature('side_energy', 'Side Energy', sideRms, null, 'RMS of side channel derived from first two decoded channels.', 0.72),
  ];
}
