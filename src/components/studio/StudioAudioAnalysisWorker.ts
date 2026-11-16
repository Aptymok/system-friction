/// <reference lib="webworker" />
import { extractDynamicFeatures } from '@/lib/studio/audio/features/dynamicFeatures';
import { extractSpectralFeatures } from '@/lib/studio/audio/features/spectralFeatures';
import { extractAdvancedSpectralFeatures } from '@/lib/studio/audio/features/advancedSpectralFeatures';
import { extractStereoFeatures } from '@/lib/studio/audio/features/stereoFeatures';
import { extractRhythmFeatures } from '@/lib/studio/audio/features/rhythmFeatures';
import { extractHarmonyFeatures } from '@/lib/studio/audio/features/harmonyFeatures';
import { calculateIntegratedLoudness } from '@/lib/studio/audio/loudness/integratedLoudness';
import { calculateLoudnessRange } from '@/lib/studio/audio/loudness/loudnessRange';
import { calculateTruePeak } from '@/lib/studio/audio/loudness/truePeak';
import type { StudioDecodedAudio, StudioAudioFeature } from '@/lib/studio/audio/audioTypes';

type WorkRequest = {
  sampleRate: number;
  durationSeconds: number;
  channels: Float32Array[];
};
type ResultFeature = Pick<StudioAudioFeature, 'key' | 'label' | 'value' | 'unit' | 'status' | 'source' | 'formulaVersion' | 'explanation' | 'warnings'>;

function project(feature: StudioAudioFeature): ResultFeature {
  return {
    key: feature.key,
    label: feature.label,
    value: feature.value,
    unit: feature.unit,
    status: feature.status,
    source: feature.source,
    formulaVersion: feature.formulaVersion,
    explanation: feature.explanation,
    warnings: feature.warnings,
  };
}
function progress(value: string) {
  self.postMessage({ type: 'progress', message: value });
}
self.onmessage = (event: MessageEvent<WorkRequest>) => {
  try {
    const input = event.data;
    if (!input || !Number.isFinite(input.sampleRate) || input.sampleRate <= 0 ||
      !Array.isArray(input.channels) || input.channels.length < 1 || input.channels.length > 2 ||
      !input.channels.every(channel => channel instanceof Float32Array && channel.length === input.channels[0].length)) {
      throw new Error('PCM_INVALID_OR_UNSUPPORTED_CHANNEL_LAYOUT');
    }
    const frameCount = input.channels[0].length;
    const decoded: StudioDecodedAudio = {
      container: 'wav',
      codec: 'float32-decoded-browser',
      sampleRate: input.sampleRate,
      channels: input.channels.length,
      bitsPerSample: 32, // Decoded representation, not source codec or original bit depth.
      byteRate: input.sampleRate * input.channels.length * 4,
      blockAlign: input.channels.length * 4,
      durationSeconds: frameCount / input.sampleRate,
      dataOffset: 0,
      dataLength: frameCount * input.channels.length * 4,
      frameCount,
      channelData: input.channels,
    };
    progress('Midiendo dinámica y campo estéreo…');
    const features: ResultFeature[] = [
      ...extractDynamicFeatures(decoded).map(project),
      ...extractStereoFeatures(decoded).map(project),
    ];
    progress('Analizando composición espectral y timbre…');
    features.push(...extractSpectralFeatures(decoded).features.map(project));
    features.push(...extractAdvancedSpectralFeatures(decoded).map(project));
    progress('Midiendo sonoridad LUFS (ponderación K y compuertas)…');
    const loudness = calculateIntegratedLoudness(decoded).result;
    features.push({
      key: loudness.metricId, label: 'Integrated LUFS', value: loudness.value,
      unit: loudness.unit, status: loudness.status, source: loudness.provenance.engine,
      formulaVersion: loudness.implementationVersion,
      explanation: 'Loudness con ponderación K, bloques de 400 ms y compuertas absoluta y relativa.',
      warnings: loudness.limitations,
    });
    const range = calculateLoudnessRange(decoded);
    features.push({
      key: range.metricId, label: 'Loudness Range', value: range.value,
      unit: range.unit, status: range.status, source: range.provenance.engine,
      formulaVersion: range.implementationVersion,
      explanation: 'Rango de sonoridad a partir de ventanas de corto plazo y compuertas.',
      warnings: range.limitations,
    });
    progress('Midiendo picos entre muestras con reconstrucción 4×…');
    const peaks = calculateTruePeak(decoded);
    for (const [metric,label,explanation] of [
      [peaks.truePeak,'True Peak','Reconstrucción 4× windowed-sinc desde PCM decodificado. Estimación sin calibración por referencia independiente.'],
      [peaks.samplePeak,'Sample Peak','Máximo de muestras decodificadas; no representa por sí solo los picos entre muestras.'],
      [peaks.headroom,'True Peak Headroom','Margen derivado de la estimación de pico verdadero.'],
    ] as const) {
      features.push({
        key:metric.metricId,label,value:metric.value,unit:metric.unit,
        status:metric.status,source:metric.provenance.engine,
        formulaVersion:metric.implementationVersion,
        explanation,warnings:metric.limitations,
      });
    }
    progress('Analizando ritmo y estimación de tempo…');
    features.push(...extractRhythmFeatures(decoded).map(project));
    // Existing tempoDrift.absoluteDelta is signed (final - initial), despite its legacy name.
    // Avoid reporting negative values as an absolute magnitude.
    const drift = features.find(feature => feature.key === 'tempo_drift_bpm');
    if (drift) {
      drift.label = 'Signed Tempo Change';
      drift.explanation = 'Difference between final and initial tempo-window estimates (signed BPM); ambiguous half/double-time can invalidate musical interpretation.';
    }
    progress('Analizando armonía, tonalidad y estabilidad…');
    features.push(...extractHarmonyFeatures(decoded).map(project));
    self.postMessage({
      type: 'result',
      report: {
        engine: 'sfi-studio-existing-audio-engines-browser',
        method: 'Decoded PCM analyzed locally with existing dynamic/stereo/spectral/timbre/loudness/rhythm/harmony engines',
        analyzedAt: new Date().toISOString(),
        durationSeconds: decoded.durationSeconds,
        sampleRateHz: decoded.sampleRate,
        channels: decoded.channels,
        sourceBitDepth: null,
        originalTransferred: false,
        originalStored: false,
        persistence: 'NONE',
        features,
        notObserved: ['FAD canonical evaluation', 'MIHM authorized measurement', 'Independent cultural impact', 'Mastering performed'],
        limitations: ['Browser decoding can alter PCM and sample-rate relative to encoded source.', 'Rhythm/key/chord results are estimates, not independently calibrated.', '4× true peak is a decoded-PCM reconstruction estimate, not a certified standard-reference measurement.', 'No publisher or third-party API was invoked.'],
      },
    });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
