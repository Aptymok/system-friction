import type { StudioDecodedAudio } from '../audioTypes';
import { calculateIntegratedLoudness } from './integratedLoudness';
import { calculateLoudnessRange } from './loudnessRange';
import { calculateMomentaryLoudness } from './momentaryLoudness';
import { calculateShortTermLoudness } from './shortTermLoudness';
import { calculateTruePeak } from './truePeak';
import { makeProvenance, type LoudnessAnalysisOptions, type LoudnessAnalysisResult } from './types';

export type {
  CapabilityOperationalState,
  LoudnessAnalysisOptions,
  LoudnessAnalysisResult,
  LoudnessCalibrationResult,
  LoudnessMetricResult,
  LoudnessWindow,
  MetricResolutionStatus,
} from './types';
export { LOUDNESS_IMPLEMENTATION_VERSION, LOUDNESS_STANDARD } from './types';
export { applyKWeighting } from './kWeighting';
export { channelWeights } from './channelWeighting';
export { calculateIntegratedLoudness } from './integratedLoudness';
export { calculateMomentaryLoudness } from './momentaryLoudness';
export { calculateShortTermLoudness } from './shortTermLoudness';
export { calculateLoudnessRange } from './loudnessRange';
export { calculateTruePeak } from './truePeak';

export function analyzeLoudness(decoded: StudioDecodedAudio, options: LoudnessAnalysisOptions = {}): LoudnessAnalysisResult {
  const integrated = calculateIntegratedLoudness(decoded, options);
  const momentary = calculateMomentaryLoudness(decoded, options);
  const shortTerm = calculateShortTermLoudness(decoded, options);
  const loudnessRange = calculateLoudnessRange(decoded, options);
  const peak = calculateTruePeak(decoded, options);
  const limitations = [
    ...integrated.result.limitations,
    ...momentary.result.limitations,
    ...shortTerm.result.limitations,
    ...loudnessRange.limitations,
    ...peak.truePeak.limitations,
    ...peak.samplePeak.limitations,
    ...peak.headroom.limitations,
  ].filter((item, index, all) => all.indexOf(item) === index);

  return {
    integrated: integrated.result,
    momentary: momentary.result,
    shortTerm: shortTerm.result,
    loudnessRange,
    truePeak: peak.truePeak,
    samplePeak: peak.samplePeak,
    truePeakHeadroom: peak.headroom,
    windows: {
      momentary: momentary.windows,
      shortTerm: shortTerm.windows,
      integratedBlocks: integrated.blocks,
    },
    limitations,
    provenance: makeProvenance(decoded, options),
  };
}
