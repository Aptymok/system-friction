#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  COMPLETION_DIAGNOSTIC_STATES,
  SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT,
  completionDiagnosticFor,
  enrichCompletionDiagnostics,
} from './lib/programCompletionDiagnostics.mjs';

const fixtures = [
  { id: 'cert', status: 'SATISFIED', evidence: ['WORKFLOW_RUN:1'], requirement: 'verified', source: 'fixture' },
  { id: 'missing', status: 'MISSING', evidence: [], requirement: 'runtime behavior must exist', source: 'fixture' },
  { id: 'coded', status: 'IN_PROGRESS', evidence: ['src/example.ts'], requirement: 'runtime behavior must execute', source: 'fixture' },
  { id: 'prod', status: 'IN_PROGRESS', evidence: ['src/example.ts'], requirement: 'must be observed in production', source: 'fixture' },
  { id: 'external', status: 'IN_PROGRESS', evidence: ['docs/readiness.md'], requirement: 'Zenodo account ownership and registry submission', source: 'fixture' },
  { id: 'super', status: 'SUPERSEDED_BY_AUTHORIZED_DECISION', evidence: [], requirement: 'old requirement', source: 'fixture' },
];

assert.equal(SFI_PROGRAM_COMPLETION_DIAGNOSTICS_CONTRACT, 'SFI-PROGRAM-COMPLETION-DIAGNOSTICS-1.0');
assert.deepEqual(COMPLETION_DIAGNOSTIC_STATES, [
  'CERTIFIED',
  'IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN',
  'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED',
  'PRODUCTION_RETURN_PENDING',
  'EXTERNAL_ACTION_PENDING',
  'SUPERSEDED',
]);
assert.equal(completionDiagnosticFor(fixtures[0]).state, 'CERTIFIED');
assert.equal(completionDiagnosticFor(fixtures[1]).state, 'IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN');
assert.equal(completionDiagnosticFor(fixtures[2]).state, 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED');
assert.equal(completionDiagnosticFor(fixtures[3]).state, 'PRODUCTION_RETURN_PENDING');
assert.equal(completionDiagnosticFor(fixtures[4]).state, 'EXTERNAL_ACTION_PENDING');
assert.equal(completionDiagnosticFor(fixtures[5]).state, 'SUPERSEDED');

const canonicalStatusesBefore = fixtures.map((item) => item.status);
const report = enrichCompletionDiagnostics({
  contract: 'SFI-PROGRAM-COMPLETION-CONTROLLER-1.4',
  counts: { SATISFIED: 1, IN_PROGRESS: 3, PARTIAL: 0, MISSING: 1, EXTERNAL_ACTION: 0, SUPERSEDED_BY_AUTHORIZED_DECISION: 1, UNCLASSIFIED: 0 },
  requirements: fixtures.map((item) => ({ ...item })),
});
assert.deepEqual(report.requirements.map((item) => item.status), canonicalStatusesBefore, 'diagnostics must never rewrite canonical disposition');
assert.equal(report.counts.SATISFIED, 1, 'canonical counts must remain untouched');
assert.equal(report.diagnosticAuthority, 'NON_AUTHORITATIVE_SEQUENCING_AID');
assert.equal(report.requirements.every((item) => item.diagnostic?.authoritative === false), true);
assert.equal(report.diagnosticCounts.CERTIFIED, 1);
assert.equal(report.diagnosticCounts.IMPLEMENTATION_INCOMPLETE_OR_UNPROVEN, 1);
assert.equal(report.diagnosticCounts.IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED, 1);
assert.equal(report.diagnosticCounts.PRODUCTION_RETURN_PENDING, 1);
assert.equal(report.diagnosticCounts.EXTERNAL_ACTION_PENDING, 1);
assert.equal(report.diagnosticCounts.SUPERSEDED, 1);

const source = await import('node:fs').then(({ readFileSync }) => readFileSync('scripts/sfi-program-completion-reconcile.mjs', 'utf8'));
assert.match(source, /code\/file presence and green CI alone never promote SATISFIED/, 'strict receipt rule must remain in canonical reconcile output');
assert.match(source, /INVALID_COMPLETION_RECEIPT/, 'invalid completion receipts must remain hard defects');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-PROGRAM-COMPLETION-DIAGNOSTICS-QA-1.0',
  canonicalDispositionMutated: false,
  satisfiedPromotionByDiagnostic: false,
  strictReceiptRulePreserved: true,
  diagnosticStates: COMPLETION_DIAGNOSTIC_STATES,
}, null, 2));
