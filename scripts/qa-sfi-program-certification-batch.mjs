#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT = 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-1.4';
const REGRESSION_SCOPE_STRATEGY = 'REQUIREMENT_PROOF_PATHS';
const TARGETED_CANONICAL_PROOFS = {
  'MASTER-03': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-029': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'ISSUE154-001': ['scripts/qa-sfi-discovery-operational.ts'],
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
assert.equal(certification.regressionScopeStrategy, REGRESSION_SCOPE_STRATEGY);
const expectedRegressionScope = [...new Set(certification.requirements.flatMap((item) => item.proofPaths))].sort();
assert.deepEqual(certification.regressionScope, expectedRegressionScope);
assert.deepEqual(certification.targetedCanonicalProofs, TARGETED_CANONICAL_PROOFS);
assert.deepEqual(Object.keys(certification.targetedCanonicalProofs).sort(), ['ISSUE154-001','MASTER-03','WS-01-029']);
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
  assert.deepEqual(item.scopePaths, item.proofPaths, `receipt regression scope must equal certified proofs: ${item.id}`);
  assert.equal(item.proofPass, true, `proof must pass: ${item.id}`);
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

assert.ok(!certification.requirements.some((item) => item.canonicalStatus === 'SATISFIED'), 'already satisfied requirement must not be recertified');
assert.ok(!certification.requirements.some((item) => item.diagnosticState === 'PRODUCTION_RETURN_PENDING'), 'production RETURN cannot be certified from repository QA');
assert.ok(!certification.requirements.some((item) => item.diagnosticState === 'EXTERNAL_ACTION_PENDING'), 'external action cannot be certified from repository QA');

const exercisedTargetedProofs = certification.requirements.filter((item) => item.targetedProofBinding === true).map((item) => item.id);
console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-QA-1.4',
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
