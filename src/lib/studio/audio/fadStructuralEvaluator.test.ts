import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFadStructuralContrast } from './fadStructuralContrast';

// Real 1-second PCM energy frames 22-34 from VETE YA - MELI voces 80bpm.wav.
// Source SHA-256: 78d3f93e6dea60c7a583b5d5cd86c9f1f1c22fa69846836787c9d5a7e5431113
// Local extractor: PCM_24, 44100 Hz, stereo, mean channel/frame-square RMS.
// QA reference only; the Studio runtime never uses these numbers as defaults.
const realRms = [
  0.0, 0.008365, 0.018887, 0.015344, 0.012114, 0.017334,
  0.015550, 0.013611, 0.015674, 0.008189, 0.011122,
  0.016843, 0.014001,
];
function segments(values: number[]) {
  return values.map((rms, i) => ({ i, t0: i, t1: i + 1, rms }));
}

test('FAD structural contrast reproduces real-audio regression subset', () => {
  assert.equal(calculateFadStructuralContrast(segments(realRms)), 0.29622);
});

test('FAD structural contrast rejects absent and invalid measurements', () => {
  assert.equal(calculateFadStructuralContrast([]), null);
  assert.equal(calculateFadStructuralContrast(segments([0, 0, 0])), null);
  assert.equal(calculateFadStructuralContrast(segments([0.1])), null);
  assert.equal(calculateFadStructuralContrast(segments([0.2, -1])), null);
  assert.equal(calculateFadStructuralContrast(segments([0.2, NaN])), null);
  const bad = segments([0.1, 0.2]);
  bad[1].t0 = -1;
  assert.equal(calculateFadStructuralContrast(bad), null);
});

test('FAD contrast is invariant under uniform amplitude scaling without clipping', () => {
  const a = calculateFadStructuralContrast(segments(realRms));
  const b = calculateFadStructuralContrast(segments(realRms.map(value => value * 2)));
  assert.ok(a !== null && b !== null);
  assert.ok(Math.abs(a - b) < 1e-8);
});
