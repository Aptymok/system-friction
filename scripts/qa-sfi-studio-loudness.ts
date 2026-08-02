import assert from 'node:assert/strict';

import { decodeStudioAudio } from '../src/lib/studio/audio/audioDecode';
import { StudioAudioError } from '../src/lib/studio/audio/audioErrors';
import { extractStudioAudioFeatures } from '../src/lib/studio/audio/features/featureRegistry';
import { analyzeLoudness, calculateTruePeak } from '../src/lib/studio/audio/loudness';

type FixtureResult = {
  name: string;
  sampleRate: number;
  channels: number;
  duration: number;
  integrated: number | null;
  momentaryStatus: string;
  momentaryWindows: number;
  shortTermStatus: string;
  shortTermWindows: number;
  lra: number | null;
  lraStatus: string;
  truePeak: number | null;
  samplePeak: number | null;
  headroom: number | null;
  limitations: string[];
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

function sine(sampleRate: number, frequency: number, amplitude: number, phase = 0) {
  return (frame: number) => Math.sin((2 * Math.PI * frequency * frame) / sampleRate + phase) * amplitude;
}

function featureValue(features: ReturnType<typeof extractStudioAudioFeatures>['features'], key: string) {
  const feature = features.find((item) => item.key === key);
  assert.ok(feature, `feature_missing:${key}`);
  return feature;
}

function assertNoUnsafeNumber(value: unknown) {
  const serialized = JSON.stringify(value);
  assert.ok(!serialized.includes('NaN'), 'nan_serialized');
  assert.ok(!serialized.includes('Infinity'), 'infinity_serialized');
  assert.ok(!serialized.includes('[object Object]'), 'object_object_serialized');
}

function runFixture(name: string, bytes: Buffer, expected?: { integrated?: { value: number; tolerance: number } }): FixtureResult {
  const decoded = decodeStudioAudio(bytes, 60);
  const analysis = analyzeLoudness(decoded, {
    trace: `qa-loudness-${name}`,
    objectId: `fixture-${name}`,
    referenceExpectations: expected?.integrated
      ? { lufs_integrated: expected.integrated }
      : undefined,
  });
  const extraction = extractStudioAudioFeatures(decoded, {
    trace: `qa-loudness-${name}`,
    objectId: `fixture-${name}`,
    referenceExpectations: expected?.integrated
      ? { lufs_integrated: expected.integrated }
      : undefined,
  });

  assert.equal(analysis.provenance.trace, `qa-loudness-${name}`);
  assert.equal(analysis.provenance.objectId, `fixture-${name}`);
  assert.ok(analysis.integrated.standard.includes('BS.1770'));
  assert.ok(analysis.truePeak.method.includes('4x'));
  assertNoUnsafeNumber(analysis);
  assert.ok(!extraction.features.some((feature) => feature.status === 'CAPABILITY_MISSING'), `capability_missing_feature:${name}`);

  for (const key of ['lufs_integrated', 'momentary_lufs_summary', 'short_term_lufs_summary', 'loudness_range_lu', 'true_peak_dbtp', 'sample_peak_dbfs', 'true_peak_headroom_db']) {
    const feature = featureValue(extraction.features, key);
    assert.ok(feature.unit, `missing_unit:${name}:${key}`);
    assert.ok(feature.payload && typeof feature.payload === 'object', `missing_payload:${name}:${key}`);
  }

  if (expected?.integrated && analysis.integrated.value !== null) {
    assert.ok(
      Math.abs(analysis.integrated.value - expected.integrated.value) <= expected.integrated.tolerance,
      `integrated_lufs_out_of_tolerance:${name}:${analysis.integrated.value}`,
    );
    assert.equal(analysis.integrated.calibration.approved, true, `integrated_calibration_not_approved:${name}`);
  }

  return {
    name,
    sampleRate: decoded.sampleRate,
    channels: decoded.channels,
    duration: Number(decoded.durationSeconds.toFixed(3)),
    integrated: analysis.integrated.value,
    momentaryStatus: analysis.momentary.status,
    momentaryWindows: analysis.windows.momentary.length,
    shortTermStatus: analysis.shortTerm.status,
    shortTermWindows: analysis.windows.shortTerm.length,
    lra: analysis.loudnessRange.value,
    lraStatus: analysis.loudnessRange.status,
    truePeak: analysis.truePeak.value,
    samplePeak: analysis.samplePeak.value,
    headroom: analysis.truePeakHeadroom.value,
    limitations: analysis.limitations,
  };
}

const sineMono = createWav({
  sampleRate: 48000,
  durationSeconds: 4,
  channels: 1,
  sample: (frame) => sine(48000, 1000, 0.1)(frame),
});
const sineStereo = createWav({
  sampleRate: 44100,
  durationSeconds: 4,
  channels: 2,
  sample: (frame, channel) => sine(44100, 1000, channel === 0 ? 0.1 : 0.1)(frame),
});
const silence = createWav({ sampleRate: 48000, durationSeconds: 4, channels: 2, sample: () => 0 });
const compressed = createWav({
  sampleRate: 48000,
  durationSeconds: 5,
  channels: 2,
  sample: (frame) => Math.tanh(sine(48000, 220, 1.8)(frame)) * 0.88,
});
const dynamic = createWav({
  sampleRate: 48000,
  durationSeconds: 8,
  channels: 2,
  sample: (frame) => {
    const seconds = frame / 48000;
    const amp = seconds < 2 ? 0.04 : seconds < 4 ? 0.18 : seconds < 6 ? 0.08 : 0.32;
    return sine(48000, 330, amp)(frame);
  },
});
const interSample = createWav({
  sampleRate: 48000,
  durationSeconds: 4,
  channels: 2,
  sample: (frame) => sine(48000, 11760, 0.97, Math.PI / 5)(frame),
});
const clipped = createWav({
  sampleRate: 48000,
  durationSeconds: 4,
  channels: 2,
  sample: (frame) => Math.max(-1, Math.min(1, sine(48000, 440, 1.4)(frame))),
});
const short = createWav({
  sampleRate: 44100,
  durationSeconds: 1,
  channels: 1,
  sample: (frame) => sine(44100, 440, 0.2)(frame),
});
const unbalanced = createWav({
  sampleRate: 48000,
  durationSeconds: 4,
  channels: 2,
  sample: (frame, channel) => sine(48000, 500, channel === 0 ? 0.2 : 0.02)(frame),
});

const results = [
  runFixture('silence', silence),
  runFixture('sine_mono_48k', sineMono, { integrated: { value: -23.7, tolerance: 1.8 } }),
  runFixture('sine_stereo_44k', sineStereo, { integrated: { value: -20.7, tolerance: 2.2 } }),
  runFixture('inter_sample_peak', interSample),
  runFixture('compressed', compressed),
  runFixture('dynamic', dynamic),
  runFixture('digital_clip', clipped),
  runFixture('short_duration', short),
  runFixture('unbalanced_channels', unbalanced),
];

for (const result of results) {
  assert.notEqual(result.integrated, Number.NaN, `integrated_nan:${result.name}`);
  assert.ok(result.momentaryWindows > 0 || result.momentaryStatus === 'INSUFFICIENT_SIGNAL', `momentary_windows_missing:${result.name}`);
  if (result.name !== 'short_duration') {
    assert.ok(result.shortTermWindows > 0, `short_term_windows_missing:${result.name}`);
  }
}

const shortResult = results.find((item) => item.name === 'short_duration');
assert.equal(shortResult?.lraStatus, 'INSUFFICIENT_SIGNAL', 'short_lra_must_be_insufficient_signal');

const interDecoded = decodeStudioAudio(interSample, 60);
const interPeak = calculateTruePeak(interDecoded, { trace: 'qa-intersample' });
assert.ok(
  interPeak.truePeak.value !== null &&
    interPeak.samplePeak.value !== null &&
    interPeak.truePeak.value >= interPeak.samplePeak.value,
  'true_peak_must_be_greater_or_equal_sample_peak',
);

const first = analyzeLoudness(decodeStudioAudio(dynamic, 60), { trace: 'qa-deterministic' });
const second = analyzeLoudness(decodeStudioAudio(dynamic, 60), { trace: 'qa-deterministic' });
assert.deepEqual(
  {
    integrated: first.integrated.value,
    momentary: first.momentary.value,
    shortTerm: first.shortTerm.value,
    lra: first.loudnessRange.value,
    truePeak: first.truePeak.value,
    samplePeak: first.samplePeak.value,
  },
  {
    integrated: second.integrated.value,
    momentary: second.momentary.value,
    shortTerm: second.shortTerm.value,
    lra: second.loudnessRange.value,
    truePeak: second.truePeak.value,
    samplePeak: second.samplePeak.value,
  },
  'loudness_engine_not_deterministic',
);

assert.throws(() => decodeStudioAudio(Buffer.from('not a wav')), StudioAudioError, 'corrupt_input_must_fail_structurally');

console.log(JSON.stringify({
  ok: true,
  fixtures: results,
  deterministic: true,
  corruptInput: 'FAILED',
}, null, 2));
