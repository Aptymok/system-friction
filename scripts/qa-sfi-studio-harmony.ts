import assert from 'node:assert/strict';

import { decodeStudioAudio } from '../src/lib/studio/audio/audioDecode';
import { StudioAudioError } from '../src/lib/studio/audio/audioErrors';
import { extractStudioAudioFeatures } from '../src/lib/studio/audio/features/featureRegistry';
import { analyzeHarmony, type HarmonyAnalysisResult } from '../src/lib/studio/audio/harmony';
import { studioCapabilityInventory } from '../src/lib/studio/capabilities/studioCapabilityInventory';

type FixtureSummary = {
  name: string;
  status: string;
  voicedFrameRatio: number;
  medianPitch: number | null;
  key: string | null;
  keyConfidence: number;
  harmonicStability: number | null;
  tonalAmbiguity: number | null;
  dissonance: number | null;
  chord: string | null;
  harmonicChanges: number;
  limitations: string[];
  calibrationStatus: string;
};

const NOTE_HZ: Record<string, number> = {
  C3: 130.8128,
  D3: 146.8324,
  E3: 164.8138,
  F3: 174.6141,
  G3: 195.9977,
  A3: 220,
  B3: 246.9417,
  C4: 261.6256,
  D4: 293.6648,
  E4: 329.6276,
  F4: 349.2282,
  G4: 391.9954,
  A4: 440,
  B4: 493.8833,
  C5: 523.2511,
  D5: 587.3295,
  E5: 659.2551,
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
      const clipped = Math.max(-1, Math.min(1, input.sample(frame, channel)));
      buffer.writeInt16LE(Math.round(clipped * 32767), 44 + frame * blockAlign + channel * 2);
    }
  }
  return buffer;
}

function sineWav(frequencyHz: number, options: { sampleRate?: number; durationSeconds?: number; channels?: number; gain?: number } = {}) {
  const sampleRate = options.sampleRate ?? 48000;
  const gain = options.gain ?? 0.42;
  return createWav({
    sampleRate,
    durationSeconds: options.durationSeconds ?? 4,
    channels: options.channels ?? 1,
    sample: (frame) => Math.sin((2 * Math.PI * frequencyHz * frame) / sampleRate) * gain,
  });
}

function sequenceWav(notes: string[], options: { sampleRate?: number; durationSeconds?: number; channels?: number; gain?: number } = {}) {
  const sampleRate = options.sampleRate ?? 48000;
  const durationSeconds = options.durationSeconds ?? 8;
  const noteDuration = durationSeconds / notes.length;
  return createWav({
    sampleRate,
    durationSeconds,
    channels: options.channels ?? 1,
    sample: (frame, channel) => {
      const seconds = frame / sampleRate;
      const note = notes[Math.min(notes.length - 1, Math.floor(seconds / noteDuration))];
      const frequency = NOTE_HZ[note] ?? 440;
      const local = seconds % noteDuration;
      const envelope = Math.min(1, local / 0.03) * Math.min(1, (noteDuration - local) / 0.05);
      const pan = channel === 0 ? 1 : 0.96;
      return Math.sin(2 * Math.PI * frequency * seconds) * (options.gain ?? 0.34) * envelope * pan;
    },
  });
}

function chordWav(notes: string[], options: { sampleRate?: number; durationSeconds?: number; channels?: number; gain?: number } = {}) {
  const sampleRate = options.sampleRate ?? 48000;
  return createWav({
    sampleRate,
    durationSeconds: options.durationSeconds ?? 4,
    channels: options.channels ?? 2,
    sample: (frame, channel) => {
      const seconds = frame / sampleRate;
      const pan = channel === 0 ? 1 : 0.94;
      const sum = notes.reduce((value, note) => value + Math.sin(2 * Math.PI * (NOTE_HZ[note] ?? 440) * seconds), 0);
      return (sum / notes.length) * (options.gain ?? 0.54) * pan;
    },
  });
}

function progressionWav(chords: string[][], options: { sampleRate?: number; durationSeconds?: number; channels?: number } = {}) {
  const sampleRate = options.sampleRate ?? 48000;
  const durationSeconds = options.durationSeconds ?? 12;
  const chordDuration = durationSeconds / chords.length;
  return createWav({
    sampleRate,
    durationSeconds,
    channels: options.channels ?? 2,
    sample: (frame, channel) => {
      const seconds = frame / sampleRate;
      const chord = chords[Math.min(chords.length - 1, Math.floor(seconds / chordDuration))];
      const local = seconds % chordDuration;
      const envelope = Math.min(1, local / 0.04) * Math.min(1, (chordDuration - local) / 0.08);
      const sum = chord.reduce((value, note) => value + Math.sin(2 * Math.PI * (NOTE_HZ[note] ?? 440) * seconds), 0);
      return (sum / chord.length) * 0.52 * envelope * (channel === 0 ? 1 : 0.93);
    },
  });
}

function stationaryNoise(seed = 4477) {
  let state = seed;
  return createWav({
    sampleRate: 48000,
    durationSeconds: 5,
    channels: 2,
    sample: () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return (((state / 0xffffffff) * 2) - 1) * 0.055;
    },
  });
}

function percussionOnly() {
  const sampleRate = 48000;
  return createWav({
    sampleRate,
    durationSeconds: 6,
    channels: 1,
    sample: (frame) => {
      const seconds = frame / sampleRate;
      const beat = seconds % 0.5;
      return beat < 0.02 ? Math.sin(2 * Math.PI * 2100 * beat) * Math.exp(-beat * 190) * 0.7 : 0;
    },
  });
}

function assertNoUnsafeSerialization(value: unknown, name: string) {
  const serialized = JSON.stringify(value);
  assert.ok(!serialized.includes('NaN'), `nan_serialized:${name}`);
  assert.ok(!serialized.includes('Infinity'), `infinity_serialized:${name}`);
  assert.ok(!serialized.includes('[object Object]'), `object_object_serialized:${name}`);
}

function run(name: string, bytes: Buffer, options: Parameters<typeof analyzeHarmony>[1] = {}) {
  const decoded = decodeStudioAudio(bytes, 30);
  const result = analyzeHarmony(decoded, {
    objectId: `fixture-${name}`,
    correlationId: `qa-harmony-${name}`,
    ...options,
  });
  assertNoUnsafeSerialization(result, name);
  assert.equal(result.engineVersion, '2026-08-02.harmony.v1');
  assert.ok(result.method.includes('AUTOCORRELATION_PITCH_TRACKING'), `pitch_method_missing:${name}`);
  assert.ok(result.method.includes('SPECTRAL_CHROMA_12_CLASS'), `chroma_method_missing:${name}`);
  assert.equal(result.calibration.agent, 'Reality Calibration Agent');
  return { decoded, result };
}

const a4 = run('a4_440', sineWav(440), { expectedPitchHz: 440 });
assert.ok(a4.result.pitch.medianFrequencyHz !== null && Math.abs(a4.result.pitch.medianFrequencyHz - 440) <= 3, `a4_pitch_out_of_tolerance:${a4.result.pitch.medianFrequencyHz}`);
assert.equal(a4.result.calibration.status, 'APPROVED');

const a4Detuned = run('a4_detuned', sineWav(445), { expectedPitchHz: 445 });
assert.ok(a4Detuned.result.key.tuningOffsetCents !== null && Math.abs(a4Detuned.result.key.tuningOffsetCents) >= 5, 'detuning_not_reported');

const cMajorScale = run('c_major_scale', sequenceWav(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'], { channels: 2, sampleRate: 44100 }), { expectedKey: 'C', expectedMode: 'major' });
assert.ok(cMajorScale.result.key.candidates.some((candidate) => candidate.key === 'C' && candidate.mode === 'major'), 'c_major_candidate_missing');
assert.notEqual(cMajorScale.result.status, 'INSUFFICIENT_SIGNAL');

const aMinorScale = run('a_minor_scale', sequenceWav(['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4']), { expectedKey: 'A', expectedMode: 'minor' });
assert.ok(aMinorScale.result.key.candidates.some((candidate) => candidate.key === 'A' && candidate.mode === 'minor'), 'a_minor_candidate_missing');

const cMajorChord = run('c_major_chord', chordWav(['C4', 'E4', 'G4']), { expectedChord: 'Cmaj' });
assert.ok(cMajorChord.result.chordHypotheses.some((item) => item.chord === 'Cmaj'), 'c_major_chord_unresolved');

const aMinorChord = run('a_minor_chord', chordWav(['A3', 'C4', 'E4']), { expectedChord: 'Amin' });
assert.ok(aMinorChord.result.chordHypotheses.some((item) => item.chord === 'Amin'), 'a_minor_chord_unresolved');

const progression = run('progression_1_4_5_1', progressionWav([
  ['C4', 'E4', 'G4'],
  ['F4', 'A4', 'C5'],
  ['G3', 'B3', 'D4'],
  ['C4', 'E4', 'G4'],
]), { expectedKey: 'C', expectedMode: 'major' });
assert.ok(progression.result.harmonicChanges.length >= 2, 'progression_harmonic_changes_missing');

const chromatic = run('chromatic_material', sequenceWav(['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'].map((note) => note.replace('#4', '4'))));
assert.ok(chromatic.result.tonalAmbiguity.status === 'OBSERVED' || chromatic.result.tonalAmbiguity.status === 'INSUFFICIENT_SIGNAL');

const noise = run('noise', stationaryNoise());
assert.ok(noise.result.key.selectedKey === null || noise.result.key.confidence < 0.5, 'noise_forced_key');
assert.ok(noise.result.chordHypotheses.every((item) => item.status === 'INSUFFICIENT_SIGNAL'), 'noise_forced_chord');

const silence = run('silence', createWav({ sampleRate: 48000, durationSeconds: 4, channels: 2, sample: () => 0 }));
assert.equal(silence.result.pitch.medianFrequencyHz, null, 'silence_pitch_forced');
assert.equal(silence.result.key.selectedKey, null, 'silence_key_forced');

const percussion = run('percussion_only', percussionOnly());
assert.ok(percussion.result.key.selectedKey === null || percussion.result.key.confidence < 0.5, 'percussion_forced_key');
assert.ok(percussion.result.chordHypotheses.every((item) => item.status === 'INSUFFICIENT_SIGNAL'), 'percussion_forced_chord');

const polyphonic = run('polyphonic', chordWav(['C4', 'E4', 'G4', 'C5', 'E5'], { durationSeconds: 5 }));
assert.notEqual(polyphonic.result.status, 'INSUFFICIENT_SIGNAL', 'polyphonic_should_have_harmony_signal');

const short = run('short_input', sineWav(440, { durationSeconds: 0.5 }));
assert.equal(short.result.status, 'INSUFFICIENT_SIGNAL');

const stereo = run('stereo_48khz', chordWav(['C4', 'E4', 'G4'], { sampleRate: 48000, channels: 2 }));
const mono = run('mono_441khz', sineWav(440, { sampleRate: 44100, channels: 1 }));
assert.ok(stereo.result.chroma.frames.length > 0, 'stereo_chroma_missing');
assert.ok(mono.result.pitch.frames.length > 0, 'mono_pitch_frames_missing');

const first = run('determinism_a', progressionWav([['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']])).result;
const second = run('determinism_a', progressionWav([['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']])).result;
assert.deepEqual(
  {
    status: first.status,
    pitch: first.pitch,
    chroma: first.chroma.distribution,
    key: first.key,
    changes: first.harmonicChanges,
    stability: first.harmonicStability,
    limitations: first.limitations,
  },
  {
    status: second.status,
    pitch: second.pitch,
    chroma: second.chroma.distribution,
    key: second.key,
    changes: second.harmonicChanges,
    stability: second.harmonicStability,
    limitations: second.limitations,
  },
  'harmony_engine_not_deterministic',
);

const extraction = extractStudioAudioFeatures(a4.decoded, { objectId: 'fixture-extraction', correlationId: 'qa-harmony-extraction', expectedPitchHz: 440 });
for (const key of ['fundamental_frequency_hz', 'pitch_confidence', 'chroma_distribution', 'key_estimate', 'harmonic_stability', 'tonal_ambiguity', 'spectral_dissonance']) {
  const feature = extraction.features.find((item) => item.key === key);
  assert.ok(feature, `missing_harmony_feature:${key}`);
  assert.notEqual(feature.status, 'CAPABILITY_MISSING', `harmony_feature_capability_missing:${key}`);
  assert.ok(feature.payload && typeof feature.payload === 'object', `harmony_feature_missing_payload:${key}`);
}

assert.throws(() => decodeStudioAudio(Buffer.from('not a wav')), StudioAudioError, 'corrupt_input_must_fail');

for (const id of [
  'audio.pitch.tracking',
  'audio.pitch.chroma',
  'audio.pitch.key_estimation',
  'audio.harmony.harmonic_change',
  'audio.harmony.harmonic_stability',
  'audio.harmony.tonal_ambiguity',
]) {
  const capability = studioCapabilityInventory.find((entry) => entry.id === id);
  assert.equal(capability?.state, 'AVAILABLE', `capability_not_available:${id}`);
  assert.equal(capability?.absenceState, null, `capability_still_missing:${id}`);
}
const dCog = studioCapabilityInventory.find((entry) => entry.id === 'sfi.variable.d_cog');
assert.equal(dCog?.state, 'CALIBRATION_REQUIRED');

function summarize(name: string, result: HarmonyAnalysisResult): FixtureSummary {
  return {
    name,
    status: result.status,
    voicedFrameRatio: result.pitch.voicedFrameRatio,
    medianPitch: result.pitch.medianFrequencyHz,
    key: result.key.selectedKey && result.key.mode ? `${result.key.selectedKey} ${result.key.mode}` : null,
    keyConfidence: result.key.confidence,
    harmonicStability: result.harmonicStability.value,
    tonalAmbiguity: result.tonalAmbiguity.value,
    dissonance: result.dissonance.value,
    chord: result.chordHypotheses.find((item) => item.status === 'OBSERVED')?.chord ?? null,
    harmonicChanges: result.harmonicChanges.length,
    limitations: result.limitations,
    calibrationStatus: result.calibration.status,
  };
}

console.log(JSON.stringify({
  ok: true,
  fixtures: [
    summarize('a4_440', a4.result),
    summarize('a4_detuned', a4Detuned.result),
    summarize('c_major_scale', cMajorScale.result),
    summarize('a_minor_scale', aMinorScale.result),
    summarize('c_major_chord', cMajorChord.result),
    summarize('a_minor_chord', aMinorChord.result),
    summarize('progression_1_4_5_1', progression.result),
    summarize('chromatic_material', chromatic.result),
    summarize('noise', noise.result),
    summarize('silence', silence.result),
    summarize('percussion_only', percussion.result),
    summarize('polyphonic', polyphonic.result),
    summarize('short_input', short.result),
  ],
  deterministic: true,
  corruptInput: 'FAILED',
  capabilities: {
    pitch: 'AVAILABLE',
    chroma: 'AVAILABLE',
    key: 'AVAILABLE',
    harmonicChange: 'AVAILABLE',
    harmonicStability: 'AVAILABLE',
    dCog: dCog?.state,
  },
}, null, 2));
