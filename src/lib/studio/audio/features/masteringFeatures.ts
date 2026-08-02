import type { StudioAudioFeature, StudioDecodedAudio } from '../audioTypes';
import {
  analyzeLoudness,
  type LoudnessAnalysisOptions,
  type LoudnessAnalysisResult,
  type LoudnessMetricResult,
} from '../loudness';

function metricFeature<T extends number | string>(
  result: LoudnessMetricResult<T>,
  label: string,
  explanation: string,
  payload: Record<string, unknown> = {},
): StudioAudioFeature {
  return {
    key: result.metricId,
    label,
    value: result.value,
    unit: result.unit,
    status: result.status,
    source: result.provenance.engine,
    confidence: result.confidence,
    formulaVersion: result.implementationVersion,
    explanation,
    warnings: result.limitations,
    payload: {
      metricId: result.metricId,
      standard: result.standard,
      implementationVersion: result.implementationVersion,
      method: result.method,
      window: result.window,
      gating: result.gating,
      limitations: result.limitations,
      provenance: result.provenance,
      calibration: result.calibration,
      details: result.details,
      ...payload,
    },
  };
}

function numericWindowFeature(input: {
  key: string;
  label: string;
  value: number | null;
  source: LoudnessMetricResult<string>;
  explanation: string;
}) {
  return metricFeature(
    {
      ...input.source,
      metricId: input.key,
      value: input.value,
      unit: 'LUFS',
      status: input.value === null ? 'INSUFFICIENT_SIGNAL' : input.source.status,
    },
    input.label,
    input.explanation,
  );
}

export function loudnessFeaturesFromAnalysis(analysis: LoudnessAnalysisResult): StudioAudioFeature[] {
  const momentaryValues = analysis.windows.momentary.map((window) => window.loudnessLufs);
  const shortTermValues = analysis.windows.shortTerm.map((window) => window.loudnessLufs);
  const momentaryMin = momentaryValues.length ? Math.min(...momentaryValues) : null;
  const momentaryMax = momentaryValues.length ? Math.max(...momentaryValues) : null;
  const shortTermMin = shortTermValues.length ? Math.min(...shortTermValues) : null;
  const shortTermMax = shortTermValues.length ? Math.max(...shortTermValues) : null;

  return [
    metricFeature(
      analysis.integrated,
      'Integrated LUFS',
      'Integrated loudness calculated with K-weighting, 400 ms blocks, absolute gate and relative gate. RMS is not relabeled as LUFS.',
      { integratedBlocks: analysis.windows.integratedBlocks.slice(0, 512) },
    ),
    metricFeature(
      analysis.momentary,
      'Momentary LUFS',
      'Momentary loudness summary calculated from 400 ms K-weighted windows.',
      { summaryWindows: analysis.windows.momentary.slice(0, 512) },
    ),
    numericWindowFeature({
      key: 'momentary_lufs_min',
      label: 'Momentary LUFS Min',
      value: momentaryMin === null ? null : Number(momentaryMin.toFixed(3)),
      source: analysis.momentary,
      explanation: 'Minimum momentary loudness across real 400 ms windows.',
    }),
    numericWindowFeature({
      key: 'momentary_lufs_max',
      label: 'Momentary LUFS Max',
      value: momentaryMax === null ? null : Number(momentaryMax.toFixed(3)),
      source: analysis.momentary,
      explanation: 'Maximum momentary loudness across real 400 ms windows.',
    }),
    metricFeature(
      analysis.shortTerm,
      'Short Term LUFS',
      'Short-term loudness summary calculated from 3 s K-weighted windows.',
      { summaryWindows: analysis.windows.shortTerm.slice(0, 512) },
    ),
    numericWindowFeature({
      key: 'short_term_lufs_min',
      label: 'Short Term LUFS Min',
      value: shortTermMin === null ? null : Number(shortTermMin.toFixed(3)),
      source: analysis.shortTerm,
      explanation: 'Minimum short-term loudness across real 3 s windows.',
    }),
    numericWindowFeature({
      key: 'short_term_lufs_max',
      label: 'Short Term LUFS Max',
      value: shortTermMax === null ? null : Number(shortTermMax.toFixed(3)),
      source: analysis.shortTerm,
      explanation: 'Maximum short-term loudness across real 3 s windows.',
    }),
    metricFeature(
      analysis.loudnessRange,
      'Loudness Range',
      'Loudness range calculated from the gated short-term loudness distribution; it is not percentile RMS.',
    ),
    metricFeature(
      analysis.truePeak,
      'True Peak',
      'True peak calculated with 4x windowed-sinc inter-sample reconstruction across channels. Sample peak remains separate.',
    ),
    metricFeature(
      analysis.samplePeak,
      'Sample Peak',
      'Sample peak measured as maximum absolute decoded sample across channels. This is not true peak.',
    ),
    metricFeature(
      analysis.truePeakHeadroom,
      'True Peak Headroom',
      'Headroom calculated as 0 dBTP minus measured true peak.',
    ),
  ];
}

export function extractMasteringFeatures(
  decoded: StudioDecodedAudio,
  options: LoudnessAnalysisOptions = {},
): StudioAudioFeature[] {
  return loudnessFeaturesFromAnalysis(analyzeLoudness(decoded, options));
}
