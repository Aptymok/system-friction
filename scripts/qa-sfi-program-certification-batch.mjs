#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT = 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-1.3';
const GLOBAL_REGRESSION_SCOPE = [
  'src/**',
  'scripts/**',
  'packages/**',
  'services/**',
  '.github/workflows/**',
  'public/**',
  'package.json',
  'package-lock.json',
  'docs/program/**',
  'docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md',
];
const TARGETED_CANONICAL_PROOFS = {
  'MASTER-03': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-029': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-040': ['scripts/qa-sfi-ws01-ownership-boundary.ts'],
  'WS-02-001': ['scripts/qa-sfi-ws02-universal-twin-lineage.ts'],
  'ISSUE154-001': ['scripts/qa-sfi-discovery-operational.ts'],
  'MASTER-20': ['scripts/qa-sfi-discovery-operational.ts'],
  'WS-01-057': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-030': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-031': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-032': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-033': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-034': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-052': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-053': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-054': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-055': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-056': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-03-001': ['scripts/qa-sfi-discovery-integrity.ts','scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-004': ['scripts/qa-sfi-discovery-exposure.ts','scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-006': ['scripts/qa-sfi-discovery-integrity.ts','scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-005': ['scripts/qa-sfi-discovery-public-live.ts'],
  'WS-04-004': ['scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-008': ['scripts/qa-sfi-temporal-surfaces.ts'],
  'WS-03-009': ['scripts/qa-sfi-temporal-surfaces.ts'],
  'WS-03-011': ['scripts/qa-sfi-temporal-surfaces.ts'],
};

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'program-completion', 'completion.json');
const returnPath = path.join(root, 'artifacts', 'program-completion', 'certification-return.json');

assert.equal(fs.existsSync(reportPath), true, 'completion report required');
assert.equal(fs.existsSync(returnPath), true, 'certification return required');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const certification = JSON.parse(fs.readFileSync(returnPath, 'utf8'));
const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

assert.equal(certification.contract, SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT);
assert.equal(certification.verifier, 'SFI-08');
assert.equal(certification.authority, 'ASSURANCE_ONLY');
assert.equal(certification.head, actualHead);
assert.equal(certification.expectedHead, actualHead);
assert.equal(certification.head, report.head);
assert.equal(certification.canonicalStatusMutation, false);
assert.equal(certification.autoReceiptWrite, false);
assert.deepEqual(certification.regressionScope, GLOBAL_REGRESSION_SCOPE);
assert.deepEqual(certification.targetedCanonicalProofs, TARGETED_CANONICAL_PROOFS);
assert.deepEqual(Object.keys(certification.targetedCanonicalProofs).sort(), ['ISSUE154-001','MASTER-03','MASTER-20','WS-01-029','WS-01-040','WS-01-057','WS-02-001','WS-03-001','WS-03-004','WS-03-005','WS-03-006','WS-03-008','WS-03-009','WS-03-011','WS-04-004','WS-01-030','WS-01-031','WS-01-032','WS-01-033','WS-01-034','WS-01-052','WS-01-053','WS-01-054','WS-01-055','WS-01-056'].sort());
assert.ok(certification.selectedCount <= certification.batchLimit);
assert.equal(certification.selectedCount, certification.requirements.length);
assert.equal(certification.failedProofCount, 0);
assert.equal(certification.returnState, 'RETURN_PASS');
assert.deepEqual(certification.canonicalCountsBefore, report.counts);
assert.equal(certification.invalidReceiptEligibleCount >= certification.selectedInvalidReceiptCount, true);

const requirementById = new Map((report.requirements || []).map((item) => [item.id, item]));
const seen = new Set();
let seenAbsent = false;
for (const item of certification.requirements) {
  assert.equal(seen.has(item.id), false, `duplicate certification id: ${item.id}`);
  seen.add(item.id);
  const source = requirementById.get(item.id);
  assert.ok(source, `unknown completion requirement: ${item.id}`);
  assert.equal(source.status, item.canonicalStatus, `canonical status mutated: ${item.id}`);
  const targetedPaths = TARGETED_CANONICAL_PROOFS[item.id] || [];
  const targeted = targetedPaths.length > 0;
  if (!targeted) assert.equal(source.diagnostic?.state, 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED');
  else assert.ok(['IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED','IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN'].includes(source.diagnostic?.state), `unsupported targeted diagnostic state: ${item.id}`);
  assert.ok(['ABSENT', 'INVALID'].includes(source.completionReceipt?.state), `unsupported prior receipt state: ${item.id}`);
  assert.equal(item.previousReceiptState, source.completionReceipt.state);
  if (item.previousReceiptState === 'ABSENT') seenAbsent = true;
  if (seenAbsent) assert.notEqual(item.previousReceiptState, 'INVALID', `invalid receipts must be prioritized before absent receipts: ${item.id}`);
  assert.equal(item.diagnosticState, source.diagnostic.state);
  assert.equal(item.targetedProofBinding, targeted);
  assert.ok(Array.isArray(item.proofPaths) && item.proofPaths.length > 0, `proof path required: ${item.id}`);
  assert.equal(item.proofPass, true, `proof must pass: ${item.id}`);
  assert.ok(Array.isArray(item.scopePaths) && item.scopePaths.length > 0, `bound regression scope required: ${item.id}`);
  if (['WS-03-001','WS-03-004','WS-03-005','WS-03-006','WS-04-004'].includes(item.id)) {
    for (const proofPath of item.proofPaths) assert.ok(item.scopePaths.includes(proofPath), `independent live proof omitted from regression scope: ${item.id}`);
    assert.equal(item.scopePaths.includes('src/**'), false, `live public boundary scope must not cover unrelated SFI organs: ${item.id}`);
    assert.ok(item.scopePaths.includes('src/lib/public/institutionProfile.ts'), `WS-03 canonical identity owner missing: ${item.id}`);
    if (['WS-03-005','WS-04-004'].includes(item.id)) {
      assert.ok(item.proofPaths.includes('scripts/qa-sfi-discovery-public-live.ts'), `live HTTP proof required: ${item.id}`);
      const execution = certification.proofExecutions.find((item) => item.path === 'scripts/qa-sfi-discovery-public-live.ts');
      assert.equal(execution?.liveAudit?.contract, 'SFI-03-LIVE-PUBLIC-BOUNDARY-1.0');
      assert.equal(execution.liveAudit.result, 'PASS');
      assert.ok(execution.liveAudit.observations.some((item) => item.path === '/' && item.status === 200), 'public home not observed');
      assert.ok(execution.liveAudit.observations.some((item) => item.path === '/api/external/v1/manifest' && item.status === 200), 'public manifest not observed');
      assert.ok(execution.liveAudit.observations.some((item) => item.path === '/api/root/discovery' && [401,403,404].includes(item.status)), 'private ROOT rejection not observed');
    }
  }
  assert.equal(item.semanticSupport.length, item.proofPaths.length, `semantic support required per proof: ${item.id}`);
  for (const proofPath of item.proofPaths) {
    assert.ok(certification.proofCatalog.includes(proofPath), `proof must come from SFI Verify run commands: ${item.id}:${proofPath}`);
    assert.ok(item.evidencePaths.includes(proofPath), `proof must be bound into certification evidence: ${item.id}:${proofPath}`);
    assert.equal(fs.existsSync(path.join(root, proofPath)), true, `proof file missing: ${proofPath}`);
    const support = item.semanticSupport.find((entry) => entry.path === proofPath);
    assert.ok(support?.supported, `proof linkage required: ${item.id}:${proofPath}`);
    if (targetedPaths.includes(proofPath)) {
      assert.equal(support.binding, 'TARGETED_CANONICAL_PROOF');
      assert.ok(TARGETED_CANONICAL_PROOFS[item.id].includes(proofPath), `targeted proof not allowlisted: ${item.id}:${proofPath}`);
    } else {
      assert.equal(support.binding, 'SEMANTIC');
      const idCount = support.matchedIdentifiers?.length || 0;
      const termCount = support.matchedTerms?.length || 0;
      assert.ok(idCount >= 2 || (idCount >= 1 && termCount >= 2) || termCount >= 3,
        `tight semantic evidence threshold not met: ${item.id}:${proofPath}`);
    }
  }
}

for (const targetedId of Object.keys(TARGETED_CANONICAL_PROOFS)) {
  const source = requirementById.get(targetedId);
  assert.ok(source, `targeted canonical requirement missing: ${targetedId}`);
  const selected = certification.requirements.some((item) => item.id === targetedId && item.targetedProofBinding === true);
  if (source.status === 'SATISFIED' && source.completionReceipt?.state === 'VALID') {
    assert.equal(selected, false, `already valid targeted receipt must not be recertified: ${targetedId}`);
  } else if (['WS-03-008','WS-03-009','WS-03-011'].includes(targetedId)
      && certification.independentProductionReturn?.state !== 'VERIFIED') {
    assert.equal(selected, false, `unobserved production must not be certified: ${targetedId}`);
  } else {
    assert.equal(selected, true, `targeted canonical proof was not exercised: ${targetedId}`);
  }
}

for (const rejected of certification.rejectedSemanticLinks || []) {
  assert.ok(Array.isArray(rejected.declaredProofs) && rejected.declaredProofs.length > 0);
  assert.ok(['ABSENT', 'INVALID'].includes(rejected.previousReceiptState));
  assert.ok((rejected.support || []).every((entry) => entry.supported === false), `rejected item contains supported proof: ${rejected.id}`);
}

for (const execution of certification.proofExecutions || []) {
  assert.equal(execution.ok, true, `executed proof failed: ${execution.path}`);
  assert.ok(certification.proofCatalog.includes(execution.path), `executed proof outside catalog: ${execution.path}`);
}

for (const id of ['WS-01-030','WS-01-031','WS-01-032','WS-01-033','WS-01-034']) {
  const item = certification.requirements.find(entry => entry.id === id);
  const original = requirementById.get(id);
  if (original?.status === 'SATISFIED' && original?.completionReceipt?.state === 'VALID') {
    assert.equal(item, undefined, 'do not recertify an already valid receipt: ' + id);
    continue;
  }
  assert.ok(item, 'bounded passport authority invariant requires proof: ' + id);
  assert.ok(item.proofPaths.includes('src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'), 'real passport QA required: ' + id);
  assert.ok(item.scopePaths.includes('src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts'), 'actual passport owner must be in regression scope: ' + id);
  assert.equal(item.scopePaths.includes('src/**'), false, 'unrelated system must not invalidate scoped receipt: ' + id);
  assert.equal(item.productionObservation, null, 'code-only passport contract must not claim production observation: ' + id);
}

for (const id of ['WS-01-052','WS-01-053','WS-01-054','WS-01-055','WS-01-056']) {
  const item = certification.requirements.find(entry => entry.id === id);
  const original = requirementById.get(id);
  if (original?.status === 'SATISFIED' && original?.completionReceipt?.state === 'VALID') {
    assert.equal(item, undefined, 'do not duplicate a valid existing receipt: ' + id);
    continue;
  }
  assert.ok(item, 'canonical passport invariant must be independently tested: ' + id);
  assert.ok(item.proofPaths.includes('src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'), 'actual passport QA required: ' + id);
  assert.ok(item.scopePaths.includes('src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts'), 'canonical owner scope required: ' + id);
  assert.equal(item.scopePaths.includes('src/**'), false, 'unrelated subsystem changes cannot invalidate passport receipt: ' + id);
  assert.equal(item.productionObservation, null, 'do not invent production observation for code-contract QA: ' + id);
}

assert.ok(!certification.requirements.some((item) => item.canonicalStatus === 'SATISFIED'), 'already satisfied requirement must not be recertified');
const observedRequirementIds = new Set(['WS-03-008','WS-03-009','WS-03-011']);
for (const item of certification.requirements.filter(item => observedRequirementIds.has(item.id))) {
  const proof = item.productionObservation;
  assert.equal(proof?.state, 'VERIFIED', 'independent production observation required: '+item.id);
  assert.equal(proof?.source, 'INDEPENDENT_PRODUCTION_GITHUB_ACTIONS_ARTIFACT');
  assert.equal(proof?.exactHead, actualHead);
  assert.equal(proof?.productionReturn, 'PASS');
  assert.equal(proof?.canonicalTarget, 'https://www.systemfriction.org');
  assert.match(String(proof?.deployedSha || ''), /^[0-9a-f]{40}$/);
  for (const name of ['deploymentRunId','smokeRunId','smokeArtifactId']) {
    assert.match(String(proof?.[name] || ''), /^\d+$/, 'source identity required: '+item.id+':'+name);
  }
  const requiredGates = item.id === 'WS-03-008' ? ['falseZero','actualZero','ssr','browser']
    : item.id === 'WS-03-009' ? ['apis','browser'] : ['hypothesisAbsence','browser'];
  for (const gate of requiredGates) assert.equal(proof.gates?.[gate], 'PASS', item.id+':'+gate+' missing independent PASS');
  assert.ok(item.proofPaths.includes('scripts/qa-sfi-temporal-surfaces.ts'), 'exact-head functional QA required: '+item.id);
  assert.ok(item.scopePaths.includes('src/components/sfi/ObservatoryConsole.tsx'), 'observatory owner scope missing: '+item.id);
  assert.equal(item.scopePaths.includes('src/**'), false, 'observatory evidence must not include unrelated modules: '+item.id);
}
assert.ok(!certification.requirements.some(item => item.diagnosticState === 'PRODUCTION_RETURN_PENDING'
  && (!observedRequirementIds.has(item.id) || item.productionObservation?.state !== 'VERIFIED')),
  'repository QA without independently observed production RETURN cannot certify production requirements');
assert.ok(!certification.requirements.some((item) => item.diagnosticState === 'EXTERNAL_ACTION_PENDING'), 'external action cannot be certified from repository QA');

const exercisedTargetedProofs = certification.requirements.filter((item) => item.targetedProofBinding === true).map((item) => item.id);
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-QA-1.3',
  head: actualHead,
  selectedCount: certification.selectedCount,
  selectedInvalidReceiptCount: certification.selectedInvalidReceiptCount,
  semanticRejectedCount: certification.semanticRejectedCount,
  targetedProofBindings: exercisedTargetedProofs,
  proofExecutionCount: certification.proofExecutions.length,
  canonicalStatusMutation: false,
  autoReceiptWrite: false,
  returnState: certification.returnState,
}));
