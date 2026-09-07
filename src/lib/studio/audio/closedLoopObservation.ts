import { sha256Bytes } from './acoustic/acousticPackageContract';
import { decodeStudioAudio } from './audioDecode';
import { extractStudioAudioFeatures } from './features/featureRegistry';
import {
  STUDIO_AUDIO_ENGINE_NAME,
  STUDIO_AUDIO_ENGINE_VERSION,
  type StudioAudioFeature,
  type StudioAudioProbe,
} from './audioTypes';
import type { SfiAudioMetricKey, SfiAudioObservation } from './closedLoop';

export const SFI_AUDIO_WAV_OBSERVATION_CONTRACT = 'SFI-AUDIO-WAV-OBSERVATION-1.0' as const;

export type SfiAudioMetricObservationState = 'OBSERVED' | 'NOT_OBSERVED';

export type SfiRenderedWavObservation = SfiAudioObservation & {
  contract: typeof SFI_AUDIO_WAV_OBSERVATION_CONTRACT;
  sourceEpistemicClass: 'GENERATED_RENDER';
  sourceSha256: `sha256:${string}`;
  culturalEvidenceEligible: false;
  metricStates: Record<SfiAudioMetricKey, SfiAudioMetricObservationState>;
  acoustic: {
    engine: typeof STUDIO_AUDIO_ENGINE_NAME;
    engineVersion: typeof STUDIO_AUDIO_ENGINE_VERSION;
    probe: StudioAudioProbe;
    features: StudioAudioFeature[];
    featureCount: number;
    energySegmentCount: number;
    frequencyBands: number[];
  };
};

const GOVERNED_METRIC_STATES: Record<SfiAudioMetricKey, SfiAudioMetricObservationState> = {
  fad: 'NOT_OBSERVED',
  wsv: 'NOT_OBSERVED',
  mihm: 'NOT_OBSERVED',
  cvf: 'NOT_OBSERVED',
};

function probeOnly(decoded: ReturnType<typeof decodeStudioAudio>): StudioAudioProbe {
  return {
    container: decoded.container,
    codec: decoded.codec,
    sampleRate: decoded.sampleRate,
    channels: decoded.channels,
    bitsPerSample: decoded.bitsPerSample,
    byteRate: decoded.byteRate,
    blockAlign: decoded.blockAlign,
    durationSeconds: decoded.durationSeconds,
    dataOffset: decoded.dataOffset,
    dataLength: decoded.dataLength,
  };
}

/**
 * Observe the bytes of an already-rendered WAV using Studio's real acoustic
 * feature engine. The observation is evidence about the generated artifact;
 * it does not promote the artifact to cultural/reference evidence and it does
 * not invent FAD, WSV, MIHM or CVF values when their canonical owners cannot
 * legitimately produce them.
 */
export function observeRenderedWavBytes(input: {
  observationId: string;
  sourceRef: string;
  wavBytes: Buffer;
  observedAt?: string;
}): SfiRenderedWavObservation {
  if (!input.observationId.trim()) throw new Error('SFI_AUDIO_OBSERVATION_ID_REQUIRED');
  if (!input.sourceRef.trim()) throw new Error('SFI_AUDIO_OBSERVATION_SOURCE_REQUIRED');
  if (!input.wavBytes.byteLength) throw new Error('SFI_AUDIO_OBSERVATION_BYTES_REQUIRED');

  const decoded = decodeStudioAudio(input.wavBytes);
  const extraction = extractStudioAudioFeatures(decoded);

  return {
    contract: SFI_AUDIO_WAV_OBSERVATION_CONTRACT,
    observationId: input.observationId,
    epistemicClass: 'OBSERVATION',
    observedAt: input.observedAt ?? new Date().toISOString(),
    sourceRef: input.sourceRef,
    sourceEpistemicClass: 'GENERATED_RENDER',
    sourceSha256: sha256Bytes(input.wavBytes),
    culturalEvidenceEligible: false,
    metrics: {},
    metricStates: { ...GOVERNED_METRIC_STATES },
    acoustic: {
      engine: STUDIO_AUDIO_ENGINE_NAME,
      engineVersion: STUDIO_AUDIO_ENGINE_VERSION,
      probe: probeOnly(decoded),
      features: extraction.features,
      featureCount: extraction.features.length,
      energySegmentCount: extraction.energySegments.length,
      frequencyBands: extraction.frequencyBands,
    },
    limitations: [
      'FAD_NOT_OBSERVED_NO_VALIDATED_AUDIO_OWNER',
      'WSV_NOT_INFERRED_FROM_WAVEFORM',
      'MIHM_NOT_OBSERVED_NO_AUTHORIZED_AUDIO_MAPPING',
      'CVF_NOT_OBSERVED_NO_EXECUTABLE_OWNER',
      'GENERATED_RENDER_OBSERVATION_IS_NOT_CULTURAL_REFERENCE_EVIDENCE',
    ],
  };
}
