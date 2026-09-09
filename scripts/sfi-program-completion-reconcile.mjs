#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateCompletionReceipt, loadCompletionReceiptLedger } from './lib/programCompletionReceipts.mjs';

const root = process.cwd();
const artifactPath = path.join(root, 'artifacts/program-completion/completion.json');
const markdownPath = path.join(root, 'artifacts/program-completion/completion.md');
const ledgerPath = path.join(root, 'docs/program/SFI-COMPLETION-RECEIPTS.json');
const LEDGER_REPOSITORY_PATH = 'docs/program/SFI-COMPLETION-RECEIPTS.json';

if (!fs.existsSync(artifactPath)) throw new Error('SFI_PROGRAM_COMPLETION_BASE_ARTIFACT_MISSING');
const report = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const ledger = loadCompletionReceiptLedger(ledgerPath);
const canonicalStatuses = ['SATISFIED','IN_PROGRESS','PARTIAL','MISSING','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'];
const invalidReceipts = [];
let promoted = 0;

function externalRequirement(requirement) {
  return /(external-only|external action|registry submission|directory submission|account ownership|platform acceptance|LinkedIn|Medium|YouTube|Bluesky|Mastodon|Hugging Face|Zenodo|ORCID|ROR|ResearchGate|Postman|OSF)/i.test(`${requirement?.source ?? ''} ${requirement?.requirement ?? ''}`);
}
function sha256File(filePath) { return `sha256:${createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')}`; }
function safeRepositoryPath(value) {
  const candidate = path.resolve(root, String(value || ''));
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('EVIDENCE_PATH_OUTSIDE_REPOSITORY');
  return candidate;
}

function verifyReceiptHead(verifiedHead, currentHead) {
  try {
    execFileSync('git', ['cat-file', '-e', `${verifiedHead}^{commit}`], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['merge-base', '--is-ancestor', verifiedHead, currentHead], { cwd: root, stdio: 'ignore' });
    const changed = execFileSync('git', ['diff', '--name-only', verifiedHead, currentHead], { cwd: root, encoding: 'utf8' })
      .split('\n').map((value) => value.trim()).filter(Boolean);
    const disallowed = changed.filter((file) => file !== LEDGER_REPOSITORY_PATH);
    if (disallowed.length) return { ok: false, error: `RECEIPT_HEAD_INVALIDATED_BY_CODE_CHANGE:${disallowed.join(',')}` };
    return { ok: true, verifiedHead, currentHead, changed };
  } catch { return { ok: false, error: 'RECEIPT_VERIFIED_HEAD_NOT_ANCESTOR' }; }
}

function verifyObservedEvidence(evidence, context) {
  const kind = String(evidence?.kind || '');
  const ref = String(evidence?.ref || '').trim();
  if (!ref) return { ok: false, error: 'EVIDENCE_REF_REQUIRED' };
  if (kind === 'GIT_COMMIT') {
    try { execFileSync('git', ['cat-file', '-e', `${ref}^{commit}`], { cwd: root, stdio: 'ignore' }); return { ok: true, observed: `git:${ref}` }; }
    catch { return { ok: false, error: 'GIT_COMMIT_NOT_OBSERVED' }; }
  }
  if (kind === 'WORKFLOW_RUN') {
    if (!/^\d+$/.test(ref)) return { ok: false, error: 'WORKFLOW_RUN_ID_REQUIRED' };
    try {
      const repository = process.env.GITHUB_REPOSITORY || report.repository || 'Aptymok/system-friction';
      const raw = execFileSync('gh', ['api', `repos/${repository}/actions/runs/${ref}`], {
        cwd: root, encoding: 'utf8', env: { ...process.env, GH_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '' },
        stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000,
      });
      const run = JSON.parse(raw);
      if (run.conclusion !== 'success') return { ok: false, error: 'WORKFLOW_RUN_NOT_SUCCESS' };
      if (run.head_sha !== context.receipt.head) return { ok: false, error: 'WORKFLOW_RUN_VERIFIED_HEAD_MISMATCH' };
      return { ok: true, observed: `workflow:${ref}@${run.head_sha}` };
    } catch { return { ok: false, error: 'WORKFLOW_RUN_NOT_OBSERVED' }; }
  }
  if (['RETURN_RECEIPT','PRODUCTION_OBSERVATION','EXTERNAL_RECEIPT'].includes(kind)) {
    try {
      const filePath = safeRepositoryPath(ref);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return { ok: false, error: 'EVIDENCE_FILE_NOT_OBSERVED' };
      if (typeof evidence.sha256 !== 'string' || !evidence.sha256.startsWith('sha256:')) return { ok: false, error: 'EVIDENCE_FILE_DIGEST_REQUIRED' };
      const observedHash = sha256File(filePath);
      if (observedHash !== evidence.sha256) return { ok: false, error: 'EVIDENCE_FILE_DIGEST_MISMATCH' };
      return { ok: true, observed: `${kind}:${ref}:${observedHash}` };
    } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
  }
  return { ok: false, error: `UNSUPPORTED_EVIDENCE_KIND:${kind}` };
}

for (const requirement of report.requirements ?? []) {
  const external = externalRequirement(requirement);
  const assessment = evaluateCompletionReceipt(requirement, ledger, {
    external, currentHead: report.head, verifyReceiptHead, verifyEvidence: verifyObservedEvidence,
  });
  requirement.completionReceipt = { state: assessment.state, error: assessment.error ?? null, requirementHash: assessment.expectedHash ?? null, externalRequirement: external };
  if (assessment.state === 'INVALID') { invalidReceipts.push({ requirementId: requirement.id, error: assessment.error, expectedHash: assessment.expectedHash }); continue; }
  if (!assessment.satisfied) continue;
  requirement.status = 'SATISFIED';
  requirement.evidence = [...new Set([...(requirement.evidence ?? []), ...(assessment.evidence ?? []).map((value) => `${value.kind}:${value.ref}`)])];
  requirement.trajectoryRef = `completion-receipt:${requirement.id}`;
  requirement.trajectoryKind = 'VERIFIED_COMPLETION_RECEIPT';
  requirement.nextAction = 'Preserve evidence and observe regression/RETURN conditions; reopen only on falsifying evidence.';
  requirement.returnCondition = 'Already met by the bound RETURN_PASS receipt; any later regression must create a new trajectory.';
  requirement.completionReceipt.receipt = assessment.receipt;
  requirement.completionReceipt.evidenceResults = assessment.evidenceResults;
  promoted += 1;
}

report.counts = Object.fromEntries(canonicalStatuses.map((status) => [status, (report.requirements ?? []).filter((r) => r.status === status).length]));
report.counts.UNCLASSIFIED = (report.requirements ?? []).filter((r) => !canonicalStatuses.includes(r.status)).length;
report.contract = 'SFI-PROGRAM-COMPLETION-CONTROLLER-1.3';
report.completionReceiptContract = ledger.contract;
report.completionReceiptState = {
  ledgerPath: LEDGER_REPOSITORY_PATH, receiptCount: Object.keys(ledger.receipts ?? {}).length, promotedSatisfiedCount: promoted,
  invalidReceiptCount: invalidReceipts.length, invalidReceipts, currentHead: report.head, independentVerifier: 'SFI-08',
  evidenceResolution: 'OBSERVED_REFERENCE_REQUIRED', verifiedHeadRule: 'EXACT_OR_LEDGER_ONLY_DESCENDANT',
};
report.qa = { ...(report.qa ?? {}), satisfiedReachableThroughBoundReceipt: true, completionReceiptsFailClosed: invalidReceipts.length === 0,
  externalClassificationIndependentOfMutableStatus: true, selfAssertedEvidenceRejected: true, ledgerCommitDoesNotSelfInvalidateReceipt: true };
for (const invalid of invalidReceipts) {
  report.hardDefects ??= [];
  report.hardDefects.push({ id: `${invalid.requirementId}:invalid-completion-receipt`, rule: 'INVALID_COMPLETION_RECEIPT', requirementId: invalid.requirementId, receiptError: invalid.error, trajectoryRef: '#405' });
}
const incomplete = (report.requirements ?? []).some((r) => !['SATISFIED','EXTERNAL_ACTION','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status));
report.nextProgramAction = invalidReceipts.length ? 'REPAIR_INVALID_COMPLETION_RECEIPTS' : incomplete ? 'EXECUTE_COMPLETION_TRAJECTORIES' : 'RUN_FINAL_ASSURANCE_AND_RETURN_GATE';
fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
const md = [
  '# SFI · Autonomous Program Completion Controller','',`**Contract:** ${report.contract}  `,`**HEAD:** ${report.head}  `,`**Generated:** ${report.generatedAt}  `,`**Receipt contract:** ${ledger.contract}  `,'',
  '## Classification',...Object.entries(report.counts).map(([key,value]) => `- ${key}: ${value}`),'','## Completion receipt assurance',
  `- receipts: ${report.completionReceiptState.receiptCount}`,`- promoted SATISFIED: ${promoted}`,`- invalid receipts: ${invalidReceipts.length}`,
  `- current HEAD: ${report.head}`,'- verifier: SFI-08 only','- verified head: exact current HEAD or an ancestor separated only by the completion receipt ledger file',
  '- rule: any intervening code/runtime/QA change invalidates the receipt','- rule: code/file presence and green CI alone never promote SATISFIED',
  '- rule: every evidence reference must resolve to observed immutable state','- external-only requirements require externalObserved=true','',
  '## Hard defects',...((report.hardDefects ?? []).length ? report.hardDefects.map((d) => `- ${d.rule}: ${d.requirementId}`) : ['- none']),'',
  '## Active completion trajectories',...(report.requirements ?? []).filter((r) => !['SATISFIED','SUPERSEDED_BY_AUTHORIZED_DECISION'].includes(r.status)).map((r) => `- **${r.id} · ${r.status} · ${r.owner} · ${r.trajectoryRef}** — ${r.requirement} — NEXT: ${r.nextAction}`),'',
  '## Authority',report.rootGateRule,
].join('\n');
fs.writeFileSync(markdownPath, `${md}\n`);
console.log(JSON.stringify({ ok: invalidReceipts.length === 0, contract: report.contract, receiptCount: report.completionReceiptState.receiptCount,
  promotedSatisfiedCount: promoted, invalidReceiptCount: invalidReceipts.length, counts: report.counts, nextProgramAction: report.nextProgramAction }));
if (invalidReceipts.length) process.exitCode = 2;
