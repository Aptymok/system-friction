import assert from 'node:assert/strict';

import { decodeStudioAudio } from '../src/lib/studio/audio/audioDecode';
import { StudioAudioError } from '../src/lib/studio/audio/audioErrors';
import { extractStudioAudioFeatures } from '../src/lib/studio/audio/features/featureRegistry';
import { analyzeRhythm, type RhythmAnalysisResult } from '../src/lib/studio/audio/rhythm';
import { studioCapabilityInventory } from '../src/lib/studio/capabilities/studioCapabilityInventory';

type FixtureSummary = {
  name: string;
  status: string;
  onsetCount: number;
  globalBpm: number | null;
  tempoConfidence: number;
  beatCount: number;
  pulseClarity: number | null;
  meter: string | null;
  syncopation: number | null;
  limitations: string[];
  calibrationStatus: string;
};

function writeAscii(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, 'ascii');
}

function createWav(input: {
  sampleRate: number;
  durationSeconds: number;
  channels: number;
  sample: (frame: number, channel: number) => number;
}) {
  const bitsPerSample = 16;
  const frameCount = Math.max(1, Math.round(input.sampleRate * input.durationSeconds));
  const blockAlign = input.channels * (bitsPerSample / 8);
  const byteRate = input.sampleRate * blockAlign;
  const dataLength = frameCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataLength);
  writeAscii(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + dataLength, 4);
  writeAscii(buffer, 8, 'WAVE');
  writeAscii(buffer, 12, 'fmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(input.channels, 22);
  buffer.writeUInt32LE(input.sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  writeAscii(buffer, 36, 'data');
  buffer.writeUInt32LE(dataLength, 40);

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < input.channels; channel += 1) {
      const raw = input.sample(frame, channel);
      const clipped = Math.max(-1, Math.min(1, Number.isFinite(raw) ? raw : 0));
      buffer.writeInt16LE(Math.round(clipped * 32767), 44 + frame * blockAlign + channel * 2);
    }
  }
  return buffer;
}

function clickTimes(input: { bpm: number; durationSeconds: number; offset?: number; accelerateToBpm?: number; syncopated?: boolean }) {
  const times: Array<{ time: number; accent: number }> = [];
  let time = input.offset ?? 0.25;
  let index = 0;
  while (time < input.durationSeconds - 0.05) {
    const progress = time / input.durationSeconds;
    const bpm = input.accelerateToBpm ? input.bpm + (input.accelerateToBpm - input.bpm) * progress : input.bpm;
    times.push({ time, accent: index % 4 === 0 ? 1 : 0.62 });
    if (input.syncopated && index % 2 === 0) times.push({ time: time + 30 / bpm, accent: 0.72 });
    time += 60 / bpm;
    index += 1;
  }
  return times;
}

function clickTrack(input: {
  sampleRate?: number;
  durationSeconds?: number;
  channels?: number;
  bpm: number;
  meter?: 3 | 4;
  accelerateToBpm?: number;
  syncopated?: boolean;
}) {
  const sampleRate = input.sampleRate ?? 48000;
  const durationSeconds = input.durationSeconds ?? 12;
  const channels = input.channels ?? 2;
  const meter = input.meter ?? 4;
  const events = clickTimes({ bpm: input.bpm, durationSeconds, accelerateToBpm: input.accelerateToBpm, syncopated: input.syncopated })
    .map((event, index) => ({ ...event, accent: index % meter === 0 ? 1 : event.accent * 0.58 }));
  return createWav({
    sampleRate,
    durationSeconds,
    channels,
    sample: (frame) => {
      const seconds = frame / sampleRate;
      let value = 0;
      for (const event of events) {
        const delta = seconds - event.time;
        if (delta >= 0 && delta < 0.018) value += Math.sin(2 * Math.PI * 1800 * delta) * Math.exp(-delta * 180) * event.accent;
      }
      return value * 0.78;
    },
  });
}

function stationaryNoise(seed = 111) {
  let state = seed;
  return createWav({
    sampleRate: 48000,
    durationSeconds: 8,
    channels: 2,
    sample: () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return (((state / 0xffffffff) * 2) - 1) * 0.04;
    },
  });
}

function assertNoUnsafeSerialization(value: unknown, name: string) {
  const serialized = JSON.stringify(value);
  assert.ok(!serialized.includes('NaN'), `nan_serialized:${name}`);
  assert.ok(!serialized.includes('Infinity'), `infinity_serialized:${name}`);
  assert.ok(!serialized.includes('[object Object]'), `object_object_serialized:${name}`);
}

function summarize(name: string, result: RhythmAnalysisResult): FixtureSummary {
  return {
    name,
    status: result.status,
    onsetCount: result.onsets.length,
    globalBpm: result.tempo.globalBpm,
    tempoConfidence: result.tempo.confidence,
    beatCount: result.beats.length,
    pulseClarity: result.pulseClarity,
    meter: result.meter.selected ? `${result.meter.selected.numerator}/${result.meter.selected.denominator}` : null,
    syncopation: result.syncopation.value,
    limitations: result.limitations,
    calibrationStatus: result.calibration.status,
  };
}

function run(name: string, bytes: Buffer, options: { expectedBpm?: number; expectedMeter?: string; expectedStatus?: string } = {}) {
  const decoded = decodeStudioAudio(bytes, 30);
  const result = analyzeRhythm(decoded, {
    objectId: `fixture-${name}`,
    correlationId: `qa-rhythm-${name}`,
    expectedBpm: options.expectedBpm ?? null,
  });
  assertNoUnsafeSerialization(result, name);
  assert.equal(result.engineVersion, '2026-08-02.rhythm.v1');
  assert.ok(result.method.includes('POSITIVE_SPECTRAL_FLUX'), `spectral_flux_method_missing:${name}`);
  assert.ok(result.method.includes('ENERGY_DELTA'), `energy_delta_method_missing:${name}`);
  assert.equal(result.calibration.agent, 'Reality Calibration Agent');
  if (options.expectedStatus) assert.equal(result.status, options.expectedStatus, `status_mismatch:${name}`);
  if (options.expectedBpm && result.tempo.globalBpm !== null) {
    assert.ok(Math.abs(result.tempo.globalBpm - options.expectedBpm) <= 5, `bpm_out_of_tolerance:${name}:${result.tempo.globalBpm}`);
    assert.notEqual(result.calibration.status, 'REFERENCE_UNAVAILABLE', `missing_calibration:${name}`);
  }
  if (options.expectedMeter && result.meter.selected) {
    assert.equal(`${result.meter.selected.numerator}/${result.meter.selected.denominator}`, options.expectedMeter, `meter_mismatch:${name}`);
  }
  return { decoded, result };
}

const silence = run('silence', createWav({ sampleRate: 48000, durationSeconds: 8, channels: 2, sample: () => 0 }));
assert.equal(silence.result.onsets.length, 0, 'silence_should_have_zero_onsets');
assert.equal(silence.result.tempo.globalBpm, null, 'silence_should_not_have_bpm');

const noise = run('stationary_noise', stationaryNoise());
assert.ok(noise.result.onsets.length < 50, `stationary_noise_false_onsets:${noise.result.onsets.length}`);

const short = run('short_signal', createWav({ sampleRate: 44100, durationSeconds: 0.8, channels: 1, sample: () => 0.2 }));
assert.equal(short.result.status, 'INSUFFICIENT_SIGNAL');

const bpm60 = run('click_60_bpm', clickTrack({ bpm: 60 }), { expectedBpm: 60 });
const bpm90 = run('click_90_bpm', clickTrack({ bpm: 90, sampleRate: 44100 }), { expectedBpm: 90 });
const bpm120 = run('click_120_bpm', clickTrack({ bpm: 120 }), { expectedBpm: 120, expectedMeter: '4/4' });
for (const item of [bpm60, bpm90, bpm120]) {
  assert.ok(item.result.onsets.length >= 8, 'click_track_missing_onsets');
  assert.ok(item.result.beats.length >= 8, 'click_track_missing_beats');
  assert.ok((item.result.pulseClarity ?? 0) > 0.25, 'click_track_low_pulse_clarity');
}

const meter34 = run('meter_3_4', clickTrack({ bpm: 90, meter: 3, durationSeconds: 14 }), { expectedBpm: 90, expectedMeter: '3/4' });
assert.ok(meter34.result.meter.candidates.length > 0, 'meter_candidates_missing');

const accelerando = run('accelerando', clickTrack({ bpm: 80, accelerateToBpm: 130, durationSeconds: 16 }));
assert.ok((accelerando.result.tempoDrift.absoluteDelta ?? 0) >= 0, 'accelerando_drift_missing');
assert.ok((accelerando.result.tempoDrift.slopeBpmPerMinute ?? 0) >= 0, 'accelerando_slope_should_be_positive_or_zero');

const decelerando = run('decelerando', clickTrack({ bpm: 130, accelerateToBpm: 80, durationSeconds: 16 }));
assert.ok((decelerando.result.tempoDrift.slopeBpmPerMinute ?? 0) <= 0, 'decelerando_slope_should_be_negative_or_zero');

const halfDouble = run('half_double', clickTrack({ bpm: 120, durationSeconds: 16 }));
assert.ok(halfDouble.result.tempo.candidates.some((candidate) => candidate.relation === 'HALF_TIME' || candidate.relation === 'DOUBLE_TIME'), 'half_double_candidate_missing');

const syncopated = run('syncopated', clickTrack({ bpm: 100, durationSeconds: 12, syncopated: true }));
assert.ok(syncopated.result.syncopation.status === 'OBSERVED' || syncopated.result.syncopation.status === 'INSUFFICIENT_SIGNAL');

const first = run('deterministic_a', clickTrack({ bpm: 100, durationSeconds: 10 })).result;
const second = run('deterministic_a', clickTrack({ bpm: 100, durationSeconds: 10 })).result;
assert.deepEqual(
  {
    status: first.status,
    onsets: first.onsets,
    tempo: first.tempo,
    beats: first.beats,
    meter: first.meter,
    limitations: first.limitations,
  },
  {
    status: second.status,
    onsets: second.onsets,
    tempo: second.tempo,
    beats: second.beats,
    meter: second.meter,
    limitations: second.limitations,
  },
  'rhythm_engine_not_deterministic',
);

const decoded120 = decodeStudioAudio(clickTrack({ bpm: 120 }), 30);
const extraction = extractStudioAudioFeatures(decoded120, { objectId: 'fixture-extraction', correlationId: 'qa-rhythm-extraction' });
for (const key of ['rhythm_onset_count', 'tempo_global_bpm', 'tempo_candidates', 'beat_count', 'pulse_clarity', 'meter_hypothesis']) {
  const feature = extraction.features.find((item) => item.key === key);
  assert.ok(feature, `missing_rhythm_feature:${key}`);
  assert.notEqual(feature.status, 'CAPABILITY_MISSING', `rhythm_feature_capability_missing:${key}`);
  assert.ok(feature.payload && typeof feature.payload === 'object', `rhythm_feature_missing_payload:${key}`);
}

assert.throws(() => decodeStudioAudio(Buffer.from('not a wav')), StudioAudioError, 'corrupt_input_must_fail');

const rhythmCapability = studioCapabilityInventory.find((entry) => entry.id === 'audio.rhythm.beat_tempo_meter');
assert.equal(rhythmCapability?.state, 'AVAILABLE');
assert.equal(rhythmCapability?.absenceState, null);
const dCog = studioCapabilityInventory.find((entry) => entry.id === 'sfi.variable.d_cog');
assert.equal(dCog?.state, 'CALIBRATION_REQUIRED');
assert.equal(dCog?.absenceState, 'CALIBRATION_REQUIRED');

const fixtures = [
  summarize('silence', silence.result),
  summarize('stationary_noise', noise.result),
  summarize('short_signal', short.result),
  summarize('click_60_bpm', bpm60.result),
  summarize('click_90_bpm', bpm90.result),
  summarize('click_120_bpm', bpm120.result),
  summarize('meter_3_4', meter34.result),
  summarize('accelerando', accelerando.result),
  summarize('decelerando', decelerando.result),
  summarize('half_double', halfDouble.result),
  summarize('syncopated', syncopated.result),
];

console.log(JSON.stringify({
  ok: true,
  fixtures,
  deterministic: true,
  corruptInput: 'FAILED',
  capabilities: {
    rhythm: rhythmCapability?.state,
    dCog: dCog?.state,
  },
}, null, 2));
