#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { requirementHash } from './lib/programCompletionReceipts.mjs';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'program-completion', 'completion.json');
const outPath = path.join(root, 'artifacts', 'program-completion', 'certification-return.json');
const verifyWorkflowPath = path.join(root, '.github', 'workflows', 'sfi-verify.yml');
const packagePath = path.join(root, 'package.json');

export const SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT = 'SFI-SFI08-COMPLETION-CERTIFICATION-BATCH-1.3';
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

// These requirements predate or outlive the current completion classifier and their
// repository evidence lists do not always name the exact canonical proof already
// executed by SFI Verify. The mapping is intentionally closed and auditable: adding
// another requirement here requires code review, and the proof must still be present
// in the SFI Verify execution catalog and pass at the exact certification head.
export const TARGETED_CANONICAL_PROOFS = Object.freeze({
  'MASTER-03': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  // Target existing source-invariant tests; no external observation or authority invented.
  'MASTER-04': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-027': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-028': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-043': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-044': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-045': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-046': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-047': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-048': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-029': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-040': ['scripts/qa-sfi-ws01-ownership-boundary.ts'],
  'WS-02-001': ['scripts/qa-sfi-ws02-universal-twin-lineage.ts'],
  'ISSUE154-001': ['scripts/qa-sfi-discovery-operational.ts'],
  'MASTER-20': ['scripts/qa-sfi-discovery-operational.ts'],
  // Citation data are read from the existing repository; unverified affiliations, ROR, and licenses fail closed.
  'WS-05-003': ['scripts/qa-sfi-research-metadata.mjs'],
  'WS-05-008': ['scripts/qa-sfi-research-metadata.mjs'],
  'WS-05-015': ['scripts/qa-sfi-research-metadata.mjs'],
  'WS-01-057': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  // Reuse the existing exhaustive source-invariant test; no duplicate runtime or synthetic production receipt.
  // Existing passport QA verifies bounded READ/RECOMMEND ceilings, zero minted tools,
  // source-derived RETURN/security/orchestration and absence of grant/external execution authority.
  'WS-01-030': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-031': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-032': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-033': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-034': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  // Existing exact-head passport and governed-broker proof paths; no asserted external effects.
  'WS-01-002': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-003': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-004': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-023': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-036': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-007': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-008': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-009': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-011': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-016': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-020': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-005': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  // Bound source-contract tests: no observations are synthesized by certification.
  'WS-01-013': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-014': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-018': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-019': ['src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts'],
  'WS-01-035': ['scripts/qa-sfi-verify-parallelism.ts'],
  'WS-01-037': ['src/lib/sfi/universalClosure.test.ts'],
  'WS-01-052': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-053': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-054': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-055': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  'WS-01-056': ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts'],
  // Original WS-03 receipts were invalidated because they covered the entire
  // repository. Re-certify against the actual canonical owners and their
  // independent discovery QA, never against unrelated audio/agent files.
  'WS-03-001': ['scripts/qa-sfi-discovery-integrity.ts','scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-004': ['scripts/qa-sfi-discovery-exposure.ts','scripts/qa-sfi-discovery-public-live.ts'],
  'WS-03-006': ['scripts/qa-sfi-discovery-integrity.ts','scripts/qa-sfi-discovery-public-live.ts'],
  // Independent live HTTP observations: canonical structured identity and
  // anonymous access to public institutional objects. No mocked responses.
  'WS-03-005': ['scripts/qa-sfi-discovery-public-live.ts'],
  'WS-04-004': ['scripts/qa-sfi-discovery-public-live.ts'],
  // Reuse actual public-host manifest and governed OAuth/MCP owner proofs.
  'WS-04-001': ['scripts/qa-sfi-discovery-public-live.ts'],
  'WS-04-002': ['scripts/qa-sfi-agent-api-hardening.ts','src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts'],
  'WS-04-008': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'MASTER-17': ['src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts','scripts/qa-sfi-agent-api-hardening.ts'],
  // Public MCP read-only invariants are tested through the existing real owner.
  'WS-04-005': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-006': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-007': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-009': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-010': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-013': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-017': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-04-020': ['scripts/qa-sfi-public-mcp-readonly.ts'],
  'WS-03-008': ['scripts/qa-sfi-temporal-surfaces.ts'],
  'WS-03-009': ['scripts/qa-sfi-temporal-surfaces.ts'],
  'WS-03-011': ['scripts/qa-sfi-temporal-surfaces.ts'],
});

// Owner-based regression scopes are code/dependency paths, NOT test data or
// claims of outcomes. All other requirements keep the old conservative scope.
export const SCOPED_REQUIREMENT_OWNERS = Object.freeze({
  ...Object.fromEntries(["WS-05-003","WS-05-008","WS-05-015"].map(id=>[id,['scripts/qa-sfi-research-metadata.mjs','CITATION.cff','README.md','package.json','src/lib/research/researchGraphProjection.ts','src/lib/public/institutionProfile.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml']])),
  'WS-04-001': ['src/app/api/external/v1/manifest/route.ts','src/lib/public/institutionProfile.ts','src/lib/discovery/canonicalObjectRegistry.ts','scripts/qa-sfi-discovery-public-live.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml'],
  'WS-04-008': ['src/lib/mcp/publicMcpServer.ts','src/app/api/mcp/public/route.ts','src/lib/discovery/canonicalObjectRegistry.ts','src/lib/public/institutionProfile.ts','scripts/qa-sfi-public-mcp-readonly.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml'],
  ...Object.fromEntries(['WS-04-002','MASTER-17'].map(id => [id, ['src/lib/mcp/authenticatedGovernedMachineAdapter.ts','src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts','src/lib/mcp/authenticatedGatewayProjection.ts','src/app/api/mcp/authenticated/**','src/lib/sfi/oauthConfig.ts','src/lib/sfi/oauthClientRegistry.ts','src/app/api/oauth/**','src/lib/sfi/externalAuth.ts','src/app/api/external/v1/**','scripts/qa-sfi-agent-api-hardening.ts','scripts/merge-openapi-cases.mjs','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml']])),
  ...Object.fromEntries(["WS-04-005","WS-04-006","WS-04-007","WS-04-009","WS-04-010","WS-04-013","WS-04-017","WS-04-020"].map(id => [id, ['src/lib/mcp/publicMcpServer.ts','src/app/api/mcp/public/route.ts','src/lib/discovery/canonicalObjectRegistry.ts','src/lib/discovery/publicSemanticProjection.ts','src/lib/public/institutionProfile.ts','src/lib/research/researchGraphProjection.ts','scripts/qa-sfi-public-mcp-readonly.ts','scripts/qa-sfi-discovery-public-live.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml']])),
  // Source-lock evidence and broker decision owner; preserve regression invalidation.
  ...Object.fromEntries(["WS-01-027","WS-01-028","WS-01-043","WS-01-044","WS-01-045","WS-01-046","WS-01-047","WS-01-048"].map(id => [id, ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts','src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts','src/lib/sfi/cognitive-runtime/convergedRegistry.ts','src/lib/sfi/cognitive-runtime/executionContracts.ts','src/lib/sfi/cognitive-runtime/agentPassports.ts','src/lib/sfi/cognitive-runtime/agentModelRequirements.ts','src/infrastructure/ai/agentLlmClient.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml']])),
  'MASTER-04': ['src/lib/sfi/cognitive-runtime/capabilityBroker.ts','src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts','src/lib/sfi/cognitive-runtime/capabilityRuntime.ts','src/lib/sfi/cognitive-runtime/automationSelector.ts','src/lib/sfi/cognitive-runtime/convergedRegistry.ts','src/lib/sfi/cognitive-runtime/executionContracts.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml'],
  'WS-01-013': ["src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts","src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts","src/lib/sfi/cognitive-runtime/agentPassports.ts","src/lib/sfi/cognitive-runtime/convergedRegistry.ts","src/lib/sfi/cognitive-runtime/executionContracts.ts","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  'WS-01-014': ["src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts","src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts","src/lib/sfi/cognitive-runtime/agentPassports.ts","src/lib/sfi/cognitive-runtime/convergedRegistry.ts","src/lib/sfi/cognitive-runtime/executionContracts.ts","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  'WS-01-018': ["src/lib/sfi/cognitive-runtime/capabilityBroker.ts","src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts","src/lib/sfi/cognitive-runtime/capabilityRuntime.ts","src/lib/sfi/cognitive-runtime/automationSelector.ts","src/lib/sfi/cognitive-runtime/convergedRegistry.ts","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  'WS-01-019': ["src/lib/sfi/cognitive-runtime/capabilityBroker.ts","src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts","src/lib/sfi/cognitive-runtime/capabilityRuntime.ts","src/lib/sfi/cognitive-runtime/automationSelector.ts","src/lib/sfi/cognitive-runtime/convergedRegistry.ts","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  'WS-01-035': ["scripts/qa-sfi-verify-parallelism.ts",".github/workflows/sfi-verify.yml","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  'WS-01-037': ["src/lib/sfi/universalClosure.ts","src/lib/sfi/universalClosure.test.ts","scripts/sfi-program-certification-batch.mjs","scripts/qa-sfi-program-certification-batch.mjs","scripts/lib/programCompletionReceipts.mjs","scripts/sfi-program-completion-reconcile.mjs",".github/workflows/sfi-verify.yml",".github/workflows/sfi-completion-certification-batch.yml"],
  // Scope covers actual owners and the independent verifier, not unrelated modules.
  ...Object.fromEntries(["WS-01-002","WS-01-003","WS-01-004","WS-01-023","WS-01-036","WS-01-005"].map(id => [id, ['src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts','src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts','src/lib/sfi/cognitive-runtime/agentPassports.ts','src/lib/sfi/cognitive-runtime/convergedRegistry.ts','src/lib/sfi/cognitive-runtime/executionContracts.ts','src/lib/sfi/cognitive-runtime/agentModelRequirements.ts','src/infrastructure/ai/agentLlmClient.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/lib/programCompletionReceipts.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml']])),
  ...Object.fromEntries(["WS-01-007","WS-01-008","WS-01-009","WS-01-011","WS-01-016","WS-01-020"].map(id => [id, ['src/lib/sfi/cognitive-runtime/capabilityBroker.ts','src/lib/sfi/cognitive-runtime/capabilityBroker.test.ts','src/lib/sfi/cognitive-runtime/capabilityRuntime.ts','src/lib/sfi/cognitive-runtime/automationSelector.ts','src/lib/sfi/cognitive-runtime/kernelContext.ts','src/lib/sfi/cognitive-runtime/convergedRegistry.ts','src/lib/sfi/cognitive-runtime/executionContracts.ts','scripts/sfi-program-certification-batch.mjs','scripts/qa-sfi-program-certification-batch.mjs','scripts/lib/programCompletionReceipts.mjs','scripts/sfi-program-completion-reconcile.mjs','.github/workflows/sfi-verify.yml','.github/workflows/sfi-completion-certification-batch.yml']])),
  // Slice-A passport guardrails: changes to the actual passport/runtime owner invalidate a receipt.
  ...Object.fromEntries(['WS-01-030','WS-01-031','WS-01-032','WS-01-033','WS-01-034'].map(id => [id, [
    'src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts',
    'src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts',
    'src/lib/sfi/cognitive-runtime/agentPassports.ts',
    'src/lib/sfi/cognitive-runtime/convergedRegistry.ts',
    'src/lib/sfi/cognitive-runtime/executionContracts.ts',
    'scripts/sfi-program-certification-batch.mjs',
    'scripts/qa-sfi-program-certification-batch.mjs',
    'scripts/lib/programCompletionReceipts.mjs',
    'scripts/sfi-program-completion-reconcile.mjs',
    '.github/workflows/sfi-verify.yml',
    '.github/workflows/sfi-completion-certification-batch.yml',
  ]])),
  // Narrow owner scopes for the five already-implemented cognitive passport invariants.
  ...Object.fromEntries(['WS-01-052','WS-01-053','WS-01-054','WS-01-055','WS-01-056'].map(id => [id, [
    'src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts',
    'src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.test.ts',
    'src/lib/sfi/cognitive-runtime/agentModelRequirements.ts',
    'src/infrastructure/ai/agentLlmClient.ts',
    'src/lib/sfi/cognitive-runtime/agentPassports.ts',
    'src/lib/sfi/cognitive-runtime/convergedRegistry.ts',
    'src/lib/sfi/cognitive-runtime/executionContracts.ts',
    'scripts/sfi-program-certification-batch.mjs',
    'scripts/qa-sfi-program-certification-batch.mjs',
    'scripts/lib/programCompletionReceipts.mjs',
    'scripts/sfi-program-completion-reconcile.mjs',
    '.github/workflows/sfi-verify.yml',
    '.github/workflows/sfi-completion-certification-batch.yml',
  ]])),

  'WS-03-001': [
    'src/lib/public/institutionProfile.ts', 'src/app/layout.tsx',
    'src/lib/discovery/**', 'public/ai-index.json',
    'src/app/api/external/v1/manifest/route.ts',
  ],
  'WS-03-004': [
    'src/lib/discovery/**', 'src/app/robots.ts', 'src/app/sitemap.ts',
    'src/app/api/external/**', 'src/app/api/root/**',
    'src/app/root/**', 'src/app/repository/**',
    'src/lib/public/institutionProfile.ts',
  ],
  'WS-03-006': [
    'src/lib/public/institutionProfile.ts', 'src/app/layout.tsx',
    'src/lib/discovery/**', 'src/app/api/external/v1/manifest/route.ts',
    'public/ai-index.json',
  ],
  'WS-03-005': [
    'src/lib/public/institutionProfile.ts', 'src/app/layout.tsx',
    'src/app/robots.ts', 'src/app/sitemap.ts',
    'src/app/api/external/v1/manifest/route.ts',
    'public/ai-index.json',
  ],
  'WS-04-004': [
    'src/app/api/external/**', 'src/app/api/root/**',
    'src/app/api/pipeline/cycles/**', 'src/lib/mcp/**',
    'src/lib/public/institutionProfile.ts',
    'src/app/layout.tsx',
  ],
  ...Object.fromEntries(['WS-03-008','WS-03-009','WS-03-011'].map(id => [id, [
    'src/lib/observatory/public/**', 'src/components/sfi/ObservatoryConsole.tsx',
    'src/app/observatory/**', 'src/app/api/observatory/**',
    'scripts/qa-sfi-temporal-surfaces.ts', 'scripts/qa-sfi-production-observatory-smoke.mjs',
    '.github/workflows/sfi-production-observatory-smoke.yml',
  ]])),
});

export function scopedRegressionPaths(requirementId, proofPaths) {
  const ownerPaths = SCOPED_REQUIREMENT_OWNERS[requirementId];
  if (!ownerPaths) return [...GLOBAL_REGRESSION_SCOPE];
  return [...new Set([...ownerPaths, ...proofPaths, 
    'scripts/sfi-program-certification-batch.mjs',
    'scripts/lib/programCompletionReceipts.mjs',
    'scripts/sfi-program-completion-reconcile.mjs',
    '.github/workflows/sfi-verify.yml',
    '.github/workflows/sfi-completion-certification-batch.yml',
  ])].sort();
}

const GENERIC_PROOF_TERMS = new Set([
  'about','after','again','against','allow','allows','already','always','another','appropriate','architecture','before','being','cannot','canonical','complete','completion','current','demonstrate','evidence','existing','explicit','external','green','implementation','institutional','internal','model','operation','operational','proof','public','required','requires','return','runtime','should','state','system','through','under','where','while','without','would','owner','source','support','supports','verify','verified','verification',
  'como','cuando','desde','debe','deben','donde','entre','estado','evidencia','para','puede','sistema','sobre','todos',
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

function workflowRunCommands(text) {
  const lines = String(text || '').split('\n');
  const commands = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^(\s*)run:\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const inline = match[2].trim();
    if (inline && inline !== '|' && inline !== '>') {
      commands.push(inline);
      continue;
    }
    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const child = lines[cursor];
      if (child.trim() === '') { block.push(''); continue; }
      const childIndent = child.match(/^\s*/)?.[0].length ?? 0;
      if (childIndent <= indent) break;
      block.push(child.slice(Math.min(child.length, indent + 2)));
      index = cursor;
    }
    commands.push(block.join('\n'));
  }
  return commands;
}

function executedProofCatalog() {
  const verifyText = fs.readFileSync(verifyWorkflowPath, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const scripts = pkg.scripts || {};
  const runCommands = workflowRunCommands(verifyText);
  const paths = new Set(runCommands.flatMap(repositoryPathsFromText));
  const queue = [...new Set(runCommands.flatMap(npmRunsFromText))];
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

function normalizedWords(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9_:-]{4,}/g) || [];
}

function semanticTerms(requirementText) {
  return [...new Set(normalizedWords(requirementText).filter((token) => token.length >= 5 && !GENERIC_PROOF_TERMS.has(token)))];
}

function strongIdentifiers(requirementText) {
  const raw = String(requirementText || '');
  const code = [...raw.matchAll(/`([^`]+)`/g)].flatMap((match) => normalizedWords(match[1]));
  const acronyms = (raw.match(/\b[A-Z][A-Z0-9_-]{2,}\b/g) || []).map((value) => value.toLowerCase());
  const camel = (raw.match(/\b[A-Z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*\b/g) || []).map((value) => value.toLowerCase());
  return [...new Set([...code, ...acronyms, ...camel].filter((token) => !GENERIC_PROOF_TERMS.has(token) && token !== 'sfi'))];
}

function semanticSupport(requirementText, repoPath) {
  const proofText = fs.readFileSync(path.join(root, repoPath), 'utf8').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = semanticTerms(requirementText);
  const identifiers = strongIdentifiers(requirementText);
  const matchedTerms = terms.filter((token) => proofText.includes(token));
  const matchedIdentifiers = identifiers.filter((token) => proofText.includes(token));
  const supported = matchedIdentifiers.length >= 2
    || (matchedIdentifiers.length >= 1 && matchedTerms.length >= 2)
    || matchedTerms.length >= 3;
  return { supported, terms, identifiers, matchedTerms, matchedIdentifiers, binding: 'SEMANTIC' };
}

function targetedSupport(requirementId, requirementText, repoPath) {
  const base = semanticSupport(requirementText, repoPath);
  const targeted = TARGETED_CANONICAL_PROOFS[requirementId]?.includes(repoPath) === true;
  return targeted
    ? { ...base, supported: true, binding: 'TARGETED_CANONICAL_PROOF' }
    : base;
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
    const output = execFileSync(command.bin, command.args, {
      cwd: root,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    // Preserve observed live output under the immutable SFI-08 artifact, not
    // merely a green exit code. No synthetic success object is generated.
    const liveAudit = repoPath === 'scripts/qa-sfi-discovery-public-live.ts'
      ? JSON.parse(output.trim().split('\n').at(-1) || 'null')
      : null;
    if (repoPath === 'scripts/qa-sfi-discovery-public-live.ts'
      && (liveAudit?.contract !== 'SFI-03-LIVE-PUBLIC-BOUNDARY-1.0'
        || liveAudit.result !== 'PASS'
        || !Array.isArray(liveAudit.observations)
        || liveAudit.observations.length < 5)) {
      throw new Error('REAL_DISCOVERY_OBSERVATION_ARTIFACT_REQUIRED');
    }
    return { path: repoPath, ok: true, durationMs: Date.now() - startedAt, command: [command.bin, ...command.args], ...(liveAudit ? { liveAudit } : {}) };
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


const INDEPENDENT_PRODUCTION_IDS = new Set(['WS-03-008','WS-03-009','WS-03-011']);
const OBSERVATORY_REGRESSION_PATHS = [
  'src/lib/observatory/public','src/components/sfi/ObservatoryConsole.tsx',
  'src/app/observatory','src/app/api/observatory',
  'scripts/qa-sfi-temporal-surfaces.ts','scripts/qa-sfi-production-observatory-smoke.mjs',
  '.github/workflows/sfi-production-observatory-smoke.yml',
];

// Read an independent post-deployment GitHub artifact and its real producer.
// A green workflow label or a local test alone never creates production evidence.
function independentlyObservedProduction(head) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { state:'NOT_OBSERVED', reason:'ACTIONS_TOKEN_UNAVAILABLE' };
  const repo = process.env.GITHUB_REPOSITORY || 'Aptymok/system-friction';
  const env = { ...process.env, GH_TOKEN:token, GITHUB_TOKEN:token };
  const api = uri => JSON.parse(execFileSync('gh',['api',uri],{cwd:root,env,encoding:'utf8',timeout:30000,maxBuffer:10*1024*1024}));
  let runs;
  try {
    runs = api('repos/'+repo+'/actions/workflows/sfi-production-observatory-smoke.yml/runs?branch=main&status=success&per_page=12').workflow_runs || [];
  } catch (error) { return {state:'NOT_OBSERVED',reason:'ACTIONS_PRODUCTION_READ_FAILED',detail:String(error).slice(0,200)}; }
  const rejected = [];
  for (const run of runs) {
    if (run.status!=='completed'||run.conclusion!=='success'||run.head_branch!=='main')continue;
    let dir;
    try {
      const artifacts=api('repos/'+repo+'/actions/runs/'+run.id+'/artifacts').artifacts||[];
      const artifact=artifacts.find(a=>!a.expired&&a.name==='sfi-production-observatory-smoke-'+run.id);
      if(!artifact||!Number.isInteger(artifact.id))throw Error('NO_OBSERVATION_ARTIFACT');
      dir=fs.mkdtempSync(path.join(os.tmpdir(),'sfi08-observed-'));
      execFileSync('gh',['run','download',String(run.id),'--repo',repo,'--name',artifact.name,'--dir',dir],{cwd:root,env,encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
      const obs=JSON.parse(fs.readFileSync(path.join(dir,'production-observatory-smoke.json'),'utf8'));
      const deployedSha=obs.relatedDeployment?.headSha;
      const deploymentId=String(obs.relatedDeployment?.runId||'');
      if(!/^[a-f0-9]{40}$/i.test(deployedSha||'')||!/^\d+$/.test(deploymentId))throw Error('INVALID_DEPLOYMENT_REF');
      const deployment=api('repos/'+repo+'/actions/runs/'+deploymentId);
      if(deployment.name!=='SFI Vercel Prebuilt Production'||deployment.status!=='completed'||deployment.conclusion!=='success'||deployment.head_branch!=='main'||deployment.head_sha!==deployedSha||run.head_sha!==deployedSha||obs.relatedDeployment.runUrl!==deployment.html_url)throw Error('DEPLOYMENT_SOURCE_NOT_BOUND');
      if(obs.contract!=='SFI-PRODUCTION-OBSERVATORY-SMOKE-1.0'||obs.productionReturn!=='PASS'||obs.target!=='https://www.systemfriction.org')throw Error('PRODUCTION_RETURN_NOT_PASS');
      const time=Date.parse(obs.completedAt||'');
      if(!Number.isFinite(time)||time>Date.now()+60000||Date.now()-time>48*3600000)throw Error('OBSERVATION_STALE');
      const gates=obs.gates||{};
      const required=['canonicalTarget','domain','ssr','apis','browser','falseZero','actualZero','hypothesisAbsence','readPlane'];
      if(!required.every(k=>gates[k]?.status==='PASS'))throw Error('PRODUCTION_GATE_FAILED');
      if(gates.actualZero.mode!=='authoritative_empty_filter'||!Array.isArray(gates.actualZero.sample?.metrics)||gates.actualZero.sample.metrics.length===0||gates.actualZero.sample.metrics.some(m=>m.availability!=='AVAILABLE'||String(m.text).trim()!=='0'))throw Error('ZERO_NOT_AUTHENTIC');
      if(gates.hypothesisAbsence.world!=='AVAILABLE'&&gates.hypothesisAbsence.absenceClaim!==false)throw Error('FALSE_HYPOTHESIS_ABSENCE');
      execFileSync('git',['merge-base','--is-ancestor',deployedSha,head],{cwd:root,encoding:'utf8',timeout:15000});
      const changed=execFileSync('git',['diff','--name-only',deployedSha+'..'+head,'--',...OBSERVATORY_REGRESSION_PATHS],{cwd:root,encoding:'utf8',timeout:15000}).trim();
      if(changed)throw Error('PRODUCTION_SCOPE_CHANGED:'+changed.slice(0,180));
      return {state:'VERIFIED',source:'INDEPENDENT_PRODUCTION_GITHUB_ACTIONS_ARTIFACT',
        observedAt:obs.completedAt,smokeRunId:String(run.id),smokeArtifactId:String(artifact.id),
        deploymentRunId:deploymentId,deployedSha,exactHead:head,
        productionReturn:obs.productionReturn,canonicalTarget:obs.target,
        scope:[...OBSERVATORY_REGRESSION_PATHS],
        gates:Object.fromEntries(required.map(k=>[k,gates[k].status]))};
    }catch(error){rejected.push({runId:String(run.id),reason:String(error).slice(0,180)})}
    finally{if(dir)fs.rmSync(dir,{recursive:true,force:true})}
  }
  return {state:'NOT_OBSERVED',reason:'NO_FRESH_BOUND_UNCHANGED_PRODUCTION_RETURN',rejected};
}

function main() {
  if (!fs.existsSync(reportPath)) throw new Error('SFI_PROGRAM_COMPLETION_DIAGNOSTIC_ARTIFACT_MISSING');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const expectedHead = String(process.env.SFI_EXPECTED_HEAD || actualHead).trim();
  if (actualHead !== expectedHead) throw new Error(`SFI_CERTIFICATION_NOT_EXACT_HEAD:${actualHead}:${expectedHead}`);
  if (report.head !== actualHead) throw new Error(`SFI_CONTROLLER_HEAD_MISMATCH:${report.head}:${actualHead}`);

  const proofCatalog = executedProofCatalog();
  const proofSet = new Set(proofCatalog);
  const independentProduction = independentlyObservedProduction(actualHead);
  const batchLimit = Math.max(1, Math.min(100, Number.parseInt(process.env.SFI_CERTIFICATION_BATCH_LIMIT || '60', 10) || 60));

  const eligible = [];
  const rejectedSemanticLinks = [];
  // A passing source-code test cannot certify a production-observation requirement.
  // Independent public observation must arrive as a distinct evidence-bound receipt.
  for (const requirement of report.requirements || []) {
    if (INDEPENDENT_PRODUCTION_IDS.has(requirement.id) && independentProduction.state !== 'VERIFIED') continue;
    const targetedPaths = (TARGETED_CANONICAL_PROOFS[requirement.id] || []).filter((repoPath) => proofSet.has(repoPath));
    const targeted = targetedPaths.length > 0;
    if (requirement?.diagnostic?.state !== 'IMPLEMENTATION_EVIDENCE_PRESENT_UNCERTIFIED' && !targeted) continue;
    const previousReceiptState = requirement?.completionReceipt?.state || 'ABSENT';
    if (!['ABSENT', 'INVALID'].includes(previousReceiptState)) continue;
    const declaredProofs = [...new Set([
      ...(requirement.evidence || []).map(normalizeRepoPath).filter((repoPath) => proofSet.has(repoPath)),
      ...targetedPaths,
    ])];
    if (!declaredProofs.length) continue;
    const support = declaredProofs.map((repoPath) => ({ path: repoPath, ...targetedSupport(requirement.id, requirement.requirement, repoPath) }));
    const proofPaths = support.filter((entry) => entry.supported).map((entry) => entry.path);
    if (!proofPaths.length) {
      rejectedSemanticLinks.push({ id: requirement.id, requirement: requirement.requirement, previousReceiptState, declaredProofs, support });
      continue;
    }
    eligible.push({ requirement, proofPaths, support, previousReceiptState, targetedPaths,
      productionObservation: INDEPENDENT_PRODUCTION_IDS.has(requirement.id) ? independentProduction : null });
  }

  const orderedEligible = [...eligible].sort((a, b) => {
    const aInvalid = a.previousReceiptState === 'INVALID' ? 1 : 0;
    const bInvalid = b.previousReceiptState === 'INVALID' ? 1 : 0;
    return bInvalid - aInvalid;
  });
  const selected = orderedEligible.slice(0, batchLimit);
  const uniqueProofPaths = [...new Set(selected.flatMap((item) => item.proofPaths))].sort();
  const proofExecutions = uniqueProofPaths.map(executeProof);
  const failed = proofExecutions.filter((result) => !result.ok);
  const executionByPath = new Map(proofExecutions.map((result) => [result.path, result]));

  const certification = {
    contract: SFI_COMPLETION_CERTIFICATION_BATCH_CONTRACT,
    generatedAt: new Date().toISOString(),
    verifier: 'SFI-08',
    authority: 'ASSURANCE_ONLY',
    head: actualHead,
    expectedHead,
    controllerContract: report.contract,
    diagnosticContract: report.diagnosticContract || null,
    batchLimit,
    eligibleCount: eligible.length,
    invalidReceiptEligibleCount: eligible.filter((item) => item.previousReceiptState === 'INVALID').length,
    semanticRejectedCount: rejectedSemanticLinks.length,
    rejectedSemanticLinks,
    selectedCount: selected.length,
    selectedInvalidReceiptCount: selected.filter((item) => item.previousReceiptState === 'INVALID').length,
    remainingEligibleAfterBatch: Math.max(0, eligible.length - selected.length),
    canonicalCountsBefore: report.counts,
    canonicalStatusMutation: false,
    autoReceiptWrite: false,
    regressionScope: [...GLOBAL_REGRESSION_SCOPE],
    targetedCanonicalProofs: TARGETED_CANONICAL_PROOFS,
    proofCatalog,
    proofExecutions,
    independentProductionReturn: independentProduction,
    requirements: selected.map(({ requirement, proofPaths, support, previousReceiptState, targetedPaths, productionObservation }) => ({
      id: requirement.id,
      owner: requirement.owner,
      source: requirement.source,
      requirement: requirement.requirement,
      requirementHash: requirementHash(requirement),
      canonicalStatus: requirement.status,
      diagnosticState: requirement.diagnostic.state,
      previousReceiptState,
      evidencePaths: [...new Set([...(requirement.evidence || []), ...targetedPaths])],
      proofPaths,
      scopePaths: scopedRegressionPaths(requirement.id, proofPaths),
      semanticSupport: support.filter((entry) => proofPaths.includes(entry.path)),
      proofPass: proofPaths.every((repoPath) => executionByPath.get(repoPath)?.ok === true),
      targetedProofBinding: targetedPaths.length > 0,
      productionObservation,
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
    invalidReceiptEligibleCount: certification.invalidReceiptEligibleCount,
    semanticRejectedCount: certification.semanticRejectedCount,
    selectedCount: certification.selectedCount,
    selectedInvalidReceiptCount: certification.selectedInvalidReceiptCount,
    targetedProofBindings: selected.filter((item) => item.targetedPaths.length > 0).map((item) => item.requirement.id),
    remainingEligibleAfterBatch: certification.remainingEligibleAfterBatch,
    independentProductionReturn: independentProduction.state,
    uniqueProofCount: uniqueProofPaths.length,
    failedProofCount: failed.length,
    returnState: certification.returnState,
  }));

  if (failed.length) process.exitCode = 2;
}

main();
