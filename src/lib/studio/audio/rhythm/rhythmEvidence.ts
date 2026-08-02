import type { RhythmAnalysisInput, RhythmAnalysisResult } from './types';

export function buildRhythmEvidence(input: RhythmAnalysisInput, result: RhythmAnalysisResult) {
  return {
    engine: 'studio_audio_rhythm_engine',
    engineVersion: result.engineVersion,
    objectId: input.objectId,
    trace: input.trace?.correlationId ?? null,
    logbookId: input.trace?.logbookId ?? null,
    status: result.status,
    confidence: result.confidence,
    limitations: result.limitations,
    onsetSummary: {
      count: result.onsets.length,
      hopSeconds: result.onsetEnvelope.hopSeconds,
      strongest: [...result.onsets].sort((left, right) => right.strength - left.strength).slice(0, 32),
    },
    tempo: result.tempo,
    beats: {
      count: result.beats.length,
      sample: result.beats.slice(0, 128),
    },
    pulseClarity: result.pulseClarity,
    tempoDrift: result.tempoDrift,
    rhythmicDensity: {
      eventsPerSecond: result.rhythmicDensity.eventsPerSecond,
      eventsPerBeat: result.rhythmicDensity.eventsPerBeat,
      windows: result.rhythmicDensity.windows.slice(0, 128),
    },
    rhythmicRegularity: result.rhythmicRegularity,
    syncopation: result.syncopation,
    meter: result.meter,
    method: result.method,
  };
}
