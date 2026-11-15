import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { calculatePhiSfi } from '../src/core/formulas/canonicalFormulas';
import { evaluateSfi } from '../src/lib/sfi/math';

// Mathematical parity fixtures are NOT asserted to be measured real-world cases.
const numericVectors = [
  [0.7, 0.6, 0.2, 0.03],
  [1, 0, 1, 0],
  [0.8, 0.7, 0.2, 0.05],
  [4, 4, 0, 1],
  [-2, 0.9, 3, 0.07],
  [0.25, 0.82, 0.78, 0.1],
];
const program = [
  'import sys,json,os',
  "sys.path.insert(0,'services/python/sfi_engine')",
  'from montecarlo import phi,run_montecarlo',
  'vectors=json.load(sys.stdin)',
  'print(json.dumps([phi(*v) for v in vectors]))',
].join('\n');
const py = spawnSync('python3', ['-c', program], {input: JSON.stringify(numericVectors), encoding: 'utf8'});
assert.equal(py.status, 0, py.stderr);
const actual = JSON.parse(py.stdout) as number[];
for(let i=0;i<numericVectors.length;i++){
  const [ihg,nti,ldi,xi] = numericVectors[i];
  assert.ok(Math.abs(actual[i]-calculatePhiSfi(ihg,nti,ldi,xi)) < 1e-12,
    `Python/TS parity failure for vector ${i}`);
}
// Refuse absent/nonfinite indicators; never silently classify them as entropy.
for(const input of [
  { ihg: Number.NaN, nti: 0.5, ldi: 0.3 },
  { ihg: 0.5, nti: Number.POSITIVE_INFINITY, ldi: 0.3 },
  { ihg: 0.5, nti: 0.6, ldi: -0.2 },
  { ihg: 0.5, nti: 0.6, ldi: 0.3, xi: Number.NaN },
  { ihg: undefined, nti: 0.6, ldi: 0.3 },
]) assert.throws(()=>evaluateSfi(input as Parameters<typeof evaluateSfi>[0]), /sfi_metric_missing_or_out_of_bounds/);
assert.ok(evaluateSfi({ihg:0.8,nti:0.7,ldi:0.2,xi:0.05}).phi>0);

const check = spawnSync('python3',['-c',[
  'import sys,os,json',
  "sys.path.insert(0,'services/python/sfi_engine')",
  'from montecarlo import run_montecarlo,phi',
  "v={'ihg':0.7,'nti':0.6,'ldi':0.2,'xi':0.03}",
  'sample=run_montecarlo(v,runs=4,horizon=2)',
  'assert sample["state"]=="BLOCKED_CALIBRATION_REQUIRED"',
  'assert sample["epistemic_status"]=="NOT_OBSERVED"',
  'assert sample["calibration_status"]=="NOT_CALIBRATED"',
  'assert sample["entropic_sample_fraction"] is None',
  'assert sample["entropic_probability"] is None',
  'assert len(sample["sample_paths"])==0',
  'try: run_montecarlo(v,runs=0); assert False',
  'except ValueError: pass',
  'try: phi(float("nan"),0.4,0.3,0.03); assert False',
  'except ValueError: pass',
  'print("MIHM_PYTHON_CONTRACT_PASS")',
].join('\n')],{encoding:'utf8'});
assert.equal(check.status,0,check.stderr);
const staticJson=JSON.parse(readFileSync('data/sfi/sf_static_dataset.compact.json','utf8'));
const staticSource=readFileSync('src/observatory/field/catalog/sfStaticDataset.ts','utf8');
assert.equal(staticJson.metadata.reference_ihg,-0.62);
assert.equal(staticJson.metadata.reference_ihg_status,'LEGACY_CLAIM_NOT_REPRODUCIBLE');
assert.ok(staticSource.includes('"reference_ihg_status": "LEGACY_CLAIM_NOT_REPRODUCIBLE"'));
assert.ok(!staticSource.includes('"reference_ihg": 0.0278333'));
const client = readFileSync('src/lib/sfi-engine/client.ts','utf8');
assert.ok(client.includes("ok: false,"), 'Transport failure must fail closed');
assert.ok(client.includes('metrics: null,'), 'Missing model cannot synthesize a measured metric');
assert.ok(client.includes("'phi_s_derivation_not_empirically_calibrated'"), 'Inferred engine must disclose calibration state');
const institutional = readFileSync('src/lib/mihm/institutionalPhiState.ts','utf8');
assert.ok(institutional.includes("['degraded', 'failed'].includes(sourceStatus.toLowerCase())"),
  'Failed acquisitions must not generate an institutional Phi');
assert.ok(institutional.includes("source_status_non_admissible_for_phi_sfi"),
  'Source failure requires explicit status');
assert.ok(institutional.includes("parsed >= 0 && parsed <= 1 ? parsed : null"),
  'Out-of-range observed metrics must be missing, not clamped');
const globalMetrics = readFileSync('src/app/api/global-metrics/route.ts','utf8');
assert.ok(globalMetrics.includes("const admissibleRows = rows.filter"),
  'Failed snapshots must not enter global IHG averages');
assert.ok(globalMetrics.includes('globalAverageIHG: null,'),
  'Unavailable averages must remain null, never invented zero');
const snapshotHistory = readFileSync('src/lib/sfi/indicatorSnapshot.ts','utf8');
assert.ok(snapshotHistory.includes("sourceStatus !== 'observed' && sourceStatus !== 'thin'"),
  'Failed rows must not become 24h trajectory baselines');
assert.ok(snapshotHistory.includes("if (ihg === null || nti === null || ldi === null || wsv === null) return null"),
  'Missing numeric inputs must not become zeros');
const montecarloRoute = readFileSync('src/app/api/sfi-engine/montecarlo/route.ts','utf8');
assert.ok(montecarloRoute.includes("mc?.calibration_status === 'CALIBRATED_AND_VALIDATED'"),
 'Uncalibrated Monte Carlo must never be HTTP 200 success');
const api=readFileSync('services/python/sfi_engine/main.py','utf8');
assert.ok(api.includes('MIHM_MISSING_MATERIAL_OBSERVATION'));
console.log(JSON.stringify({ok:true,parityVectors: numericVectors.length,
  noMocksOrScientificCalibrationClaims:true,formulaPreserved:true,
  sourceHistoricalIHGNotRewritten:true,pythonSampleStatus:'BLOCKED_UNTIL_CALIBRATED'}));
