#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCompletionReceipt, loadCompletionReceiptLedger } from './lib/programCompletionReceipts.mjs';

const root = process.cwd();
const artifactPath = path.join(root, 'artifacts/program-completion/completion.json');
const markdownPath = path.join(root, 'artifacts/program-completion/completion.md');
const ledgerPath = path.join(root, 'docs/program/SFI-COMPLETION-RECEIPTS.json');

if (!fs.existsSync(artifactPath)) throw new Error('SFI_PROGRAM_COMPLETION_BASE_ARTIFACT_MISSING');

const report = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const ledger = loadCompletionReceiptLedger(ledgerPath);
const canonicalStatuses = ['SATISFIED','IN_PROGRESS','PARTIAL','MISSING','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'];
const invalidReceipts = [];
let promoted = 0;

for (const requirement of report.requirements ?? []) {
  const external = requirement.status === 'EXTERNAL_ACTION';
  const assessment = evaluateCompletionReceipt(requirement, ledger, { external });
  requirement.completionReceipt = {
    state: assessment.state,
    error: assessment.error ?? null,
    requirementHash: assessment.expectedHash ?? null,
  };

  if (assessment.state === 'INVALID') {
    invalidReceipts.push({ requirementId: requirement.id, error: assessment.error, expectedHash: assessment.expectedHash });
    continue;
  }
  if (!assessment.satisfied) continue;

  requirement.status = 'SATISFIED';
  requirement.evidence = [...new Set([...(requirement.evidence ?? []), ...(assessment.evidence ?? [])])];
  requirement.trajectoryRef = `completion-receipt:${requirement.id}`;
  requirement.trajectoryKind = 'VERIFIED_COMPLETION_RECEIPT';
  requirement.nextAction = 'Preserve evidence and observe regression/RETURN conditions; reopen only on falsifying evidence.';
  requirement.returnCondition = 'Already met by the bound RETURN_PASS receipt; any later regression must create a new trajectory.';
  requirement.completionReceipt.receipt = assessment.receipt;
  promoted += 1;
}

report.counts = Object.fromEntries(canonicalStatuses.map((status) => [status, (report.requirements ?? []).filter((r) => r.status === status).length]));
report.counts.UNCLASSIFIED = (report.requirements ?? []).filter((r) => !canonicalStatuses.includes(r.status)).length;
report.contract = 'SFI-PROGRAM-COMPLETION-CONTROLLER-1.1';
report.completionReceiptContract = ledger.contract;
report.completionReceiptState = {
  ledgerPath: 'docs/program/SFI-COMPLETION-RECEIPTS.json',
  receiptCount: Object.keys(ledger.receipts ?? {}).length,
  promotedSatisfiedCount: promoted,
  invalidReceiptCount: invalidReceipts.length,
  invalidReceipts,
};
report.qa = {
  ...(report.qa ?? {}),
  satisfiedReachableThroughBoundReceipt: true,
  completionReceiptsFailClosed: invalidReceipts.length === 0,
};

for (const invalid of invalidReceipts) {
  report.hardDefects ??= [];
  report.hardDefects.push({
    id: `${invalid.requirementId}:invalid-completion-receipt`,
    rule: 'INVALID_COMPLETION_RECEIPT',
    requirementId: invalid.requirementId,
    receiptError: invalid.error,
    trajectoryRef: '#405',
  });
}

const incomplete = (report.requirements ?? []).some((r) => !['SATISFIED','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status));
report.nextProgramAction = invalidReceipts.length
  ? 'REPAIR_INVALID_COMPLETION_RECEIPTS'
  : incomplete
    ? 'EXECUTE_COMPLETION_TRAJECTORIES'
    : 'RUN_FINAL_ASSURANCE_AND_RETURN_GATE';

fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# SFI · Autonomous Program Completion Controller',
  '',
  `**Contract:** ${report.contract}  `,
  `**HEAD:** ${report.head}  `,
  `**Generated:** ${report.generatedAt}  `,
  `**Receipt contract:** ${ledger.contract}  `,
  '',
  '## Classification',
  ...Object.entries(report.counts).map(([key, value]) => `- ${key}: ${value}`),
  '',
  '## Completion receipt assurance',
  `- receipts: ${report.completionReceiptState.receiptCount}`,
  `- promoted SATISFIED: ${promoted}`,
  `- invalid receipts: ${invalidReceipts.length}`,
  '- rule: code/file presence and green CI alone never promote SATISFIED',
  '- external-only requirements require externalObserved=true in the bound receipt',
  '',
  '## Hard defects',
  ...((report.hardDefects ?? []).length ? report.hardDefects.map((d) => `- ${d.rule}: ${d.requirementId}`) : ['- none']),
  '',
  '## Active completion trajectories',
  ...(report.requirements ?? []).filter((r) => !['SATISFIED','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status)).map((r) => `- **${r.id} · ${r.status} · ${r.owner} · ${r.trajectoryRef}** — ${r.requirement} — NEXT: ${r.nextAction}`),
  '',
  '## Authority',
  report.rootGateRule,
].join('\n');
fs.writeFileSync(markdownPath, `${md}\n`);

console.log(JSON.stringify({
  ok: invalidReceipts.length === 0,
  contract: report.contract,
  receiptCount: report.completionReceiptState.receiptCount,
  promotedSatisfiedCount: promoted,
  invalidReceiptCount: invalidReceipts.length,
  counts: report.counts,
  nextProgramAction: report.nextProgramAction,
}));
if (invalidReceipts.length) process.exitCode = 2;
