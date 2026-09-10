#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { requirementHash } from './lib/programCompletionReceipts.mjs';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'program-completion', 'completion.json');
const outPath = path.join(root, 'artifacts', 'program-completion', 'certification-return.json');
const verifyWorkflowPath = path.join(root, '.github', 'workflows', 'sfi-verify.yml');
const packagePath = path.join(root, 'package.json');

export const SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT = 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-1.0';
export const GLOBAL_REGRESSION_SCOPE = Object.freeze([
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
]);

function normalizeRepoPath(value) {
  return String(value || '').trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function proofLike(repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const base = path.posix.basename(normalized);
  return /(^|\/)qa-[^/]+\.(?:ts|tsx|mjs|js|cjs)$/.test(normalized)
    || /\.test\.(?:ts|tsx|mjs|js|cjs)$/.test(normalized)
    || base === 'check-domain-boundaries.mjs'
    || base === 'studio-audio-engine-smoke.cjs';
}

function repositoryPathsFromText(text) {
  const matches = String(text || '').match(/(?:scripts|src|packages|services)\/[A-Za-z0-9_@.\/[\]-]+\.(?:ts|tsx|mjs|cjs|js)/g) || [];
  return matches.map(normalizeRepoPath);
}

function npmRunsFromText(text) {
  const out = [];
  const re = /npm\s+run\s+([A-Za-z0-9:_-]+)/g;
  let match;
  while ((match = re.exec(String(text || '')))) out.push(match[1]);
  return out;
}

function executedProofCatalog() {
  const verifyText = fs.readFileSync(verifyWorkflowPath, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = pkg.scripts || {};
  const paths = new Set(repositoryPathsFromText(verifyText));
  const queue = [...new Set(npmRunsFromText(verifyText))];
  const seenScripts = new Set();

  while (queue.length) {
    const name = queue.shift();
    if (!name || seenScripts.has(name)) continue;
    seenScripts.add(name);
    const command = String(scripts[name] || '');
    for (const repoPath of repositoryPathsFromText(command)) paths.add(repoPath);
    for (const nested of npmRunsFromText(command)) if (!seenScripts.has(nested)) queue.push(nested);
  }

  return [...paths]
    .filter(proofLike)
    .filter((repoPath) => fs.existsSync(path.join(root, repoPath)))
    .sort();
}

function commandForProof(repoPath) {
  if (/\.test\.(?:ts|tsx)$/.test(repoPath)) return { bin: 'node', args: ['--import', 'tsx', '--test', repoPath] };
  if (/\.test\.(?:mjs|js|cjs)$/.test(repoPath)) return { bin: 'node', args: ['--test', repoPath] };
  if (/\.(?:ts|tsx)$/.test(repoPath)) return { bin: 'npx', args: ['tsx', repoPath] };
  return { bin: 'node', args: [repoPath] };
}

function executeProof(repoPath) {
  const command = commandForProof(repoPath);
  const startedAt = Date.now();
  try {
    execFileSync(command.bin, command.args, {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { path: repoPath, ok: true, durationMs: Date.now() - startedAt, command: [command.bin, ...command.args] };
  } catch (error) {
    const stdout = typeof error?.stdout === 'string' ? error.stdout.slice(-4000) : '';
    const stderr = typeof error?.stderr === 'string' ? error.stderr.slice(-4000) : '';
    return {
      path: repoPath,
      ok: false,
      durationMs: Date.now() - startedAt,
      command: [command.bin, ...command.args],
      error: error instanceof Error ? error.message : String(error),
      stdout,
      stderr,
    };
  }
}

function main() {
  if (!fs.existsSync(reportPath)) throw new Error('SFI_PROGRAM_COMPLETION_DIAGNOSTIC_ARTIFACT_MISSING');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const proofCatalog = executedProofCatalog();
  const proofSet = new Set(proofCatalog);
  const batchLimit = Math.max(1, Math.min(50, Number.parseInt(process.env.SFI_CERTIFICATION_BATCH_LIMIT || '20', 10) || 20));

  const eligible = [];
  for (const requirement of report.requirements || []) {
    if (requirement?.diagnostic?.state !== 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED') continue;
    if (requirement?.completionReceipt?.state && requirement.completionReceipt.state !== 'ABSENT') continue;
    const proofPaths = [...new Set((requirement.evidence || []).map(normalizeRepoPath).filter((repoPath) => proofSet.has(repoPath)))];
    if (!proofPaths.length) continue;
    eligible.push({ requirement, proofPaths });
  }

  const selected = eligible.slice(0, batchLimit);
  const uniqueProofPaths = [...new Set(selected.flatMap((item) => item.proofPaths))].sort();
  const proofExecutions = uniqueProofPaths.map(executeProof);
  const failed = proofExecutions.filter((result) => !result.ok);
  const executionByPath = new Map(proofExecutions.map((result) => [result.path, result]));

  const certification = {
    contract: SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT,
    generatedAt: new Date().toISOString(),
    verifier: 'SFI-08',
    authority: 'ASSURANCE_ONLY',
    head: report.head,
    controllerContract: report.contract,
    diagnosticContract: report.diagnosticContract || null,
    batchLimit,
    eligibleCount: eligible.length,
    selectedCount: selected.length,
    remainingEligibleAfterBatch: Math.max(0, eligible.length - selected.length),
    canonicalCountsBefore: report.counts,
    canonicalStatusMutation: false,
    autoReceiptWrite: false,
    regressionScope: [...GLOBAL_REGRESSION_SCOPE],
    proofCatalog,
    proofExecutions,
    requirements: selected.map(({ requirement, proofPaths }) => ({
      id: requirement.id,
      owner: requirement.owner,
      source: requirement.source,
      requirement: requirement.requirement,
      requirementHash: requirementHash(requirement),
      canonicalStatus: requirement.status,
      diagnosticState: requirement.diagnostic.state,
      evidencePaths: [...(requirement.evidence || [])],
      proofPaths,
      proofPass: proofPaths.every((repoPath) => executionByPath.get(repoPath)?.ok === true),
    })),
    returnState: failed.length ? 'RETURN_FAIL' : 'RETURN_PASS',
    failedProofCount: failed.length,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(certification, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: failed.length === 0,
    contract: certification.contract,
    head: certification.head,
    eligibleCount: certification.eligibleCount,
    selectedCount: certification.selectedCount,
    remainingEligibleAfterBatch: certification.remainingEligibleAfterBatch,
    uniqueProofCount: uniqueProofPaths.length,
    failedProofCount: failed.length,
    returnState: certification.returnState,
  }));

  if (failed.length) process.exitCode = 2;
}

main();
