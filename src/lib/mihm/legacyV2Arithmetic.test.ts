import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Historical document reproduction only, NOT the canonical MIHM formula.
 * Primary source: MIHM_v2_final.pdf, 23 February 2026, tables 2 and 6,
 * equation IHG = mean((C-E)*(1-min(L*(1+(1-M)),1))).
 * The published values are preserved as legacy CLAIMS for falsification.
 */
type LegacyNode = { C: number; E: number; L: number; M: number };

function legacyV2Ihg(nodes: LegacyNode[]): number | null {
  if (nodes.length === 0) return null;
  if (nodes.some((n) => [n.C, n.E, n.L, n.M].some((v) => !Number.isFinite(v) || v < 0 || v > 1))) {
    return null;
  }
  return nodes.reduce((sum, n) => {
    const effectiveL = Math.min(n.L * (1 + (1 - n.M)), 1);
    return sum + (n.C - n.E) * (1 - effectiveL);
  }, 0) / nodes.length;
}

const pre: LegacyNode[] = [
  { C: 0.18, E: 0.82, L: 0.88, M: 1 },
  { C: 0.75, E: 0.65, L: 0.45, M: 1 },
  { C: 0.85, E: 0.25, L: 0.20, M: 1 },
  { C: 0.35, E: 0.92, L: 0.75, M: 1 },
  { C: 0.60, E: 0.55, L: 0.65, M: 1 },
];

const post: LegacyNode[] = [
  { C: 0.18, E: 0.89, L: 0.92, M: 1 },
  { C: 0.68, E: 0.78, L: 0.72, M: 1 },
  { C: 0.85, E: 0.35, L: 0.35, M: 1 },
  { C: 0.35, E: 0.96, L: 0.88, M: 1 },
  { C: 0.60, E: 0.68, L: 0.78, M: 0.50 },
  { C: 0.40, E: 0.95, L: 0.85, M: 0.70 },
];

const near = (a: number | null, b: number) => {
  assert.notEqual(a, null);
  assert.ok(Math.abs((a as number) - b) < 1e-10, `Expected ${b}; got ${a}`);
};

test('P0: published pre- and post-legacy IHG do not match the published equation/inputs', () => {
  const before = legacyV2Ihg(pre);
  const after = legacyV2Ihg(post);
  near(before, 0.06664);
  near(after, 0.027833333333333335);
  assert.ok(Math.abs((before as number) - (-0.41)) > 0.01);
  assert.ok(Math.abs((after as number) - (-0.62)) > 0.01);
});

test('P0: published telemetria-N6 change does not improve legacy IHG', () => {
  const intervention = post.map((node, i) => i === 5 ? { ...node, L: 0.43 } : { ...node });
  const difference = (legacyV2Ihg(intervention) as number) - (legacyV2Ihg(post) as number);
  near(difference, -0.040425);
  assert.ok(difference < 0, 'The legacy claim of a positive +0.12 change is not reproduced.');
});

test('P0: the strict legacy IHG<-1 collapse branch is unreachable for valid normalized input', () => {
  const candidate = legacyV2Ihg([
    { C: 0, E: 1, L: 0, M: 1 },
    { C: 0, E: 1, L: 1, M: 0 },
  ]);
  near(candidate, -0.5);
  // Each term (C-E)*(1-effectiveL) is in [-1,1] when C/E/L/M are in [0,1].
  // Their arithmetic mean therefore cannot be less than -1.
  assert.ok((candidate as number) >= -1);
  assert.equal(legacyV2Ihg([{ C: 0, E: 1, L: 0, M: 1 }]), -1);
  assert.ok(!((legacyV2Ihg([{ C: 0, E: 1, L: 0, M: 1 }]) as number) < -1));
  assert.equal(legacyV2Ihg([{ C: 0, E: 1.2, L: 0, M: 1 }]), null);
});

test('P0: ICE and NTI can be reproducible while the IHG is not', () => {
  const ice = Math.max(...post.map((x) => x.E)) / post.reduce((s, x) => s + x.E, 0);
  near(ice, 0.96 / 4.61);
  near(((1 - 1) + 0.32 + 0 + 0.935 + 0.5) / 5, 0.351);
  const corrected = (legacyV2Ihg(post) as number) * 0.351;
  near(corrected, 0.0097695);
  assert.ok(Math.abs(corrected - (-0.218)) > 0.01);
});
