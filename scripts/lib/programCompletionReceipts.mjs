import { createHash } from 'node:crypto';
import fs from 'node:fs';

export const COMPLETION_RECEIPT_CONTRACT = 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.3';

export function requirementHash(requirement) {
  const source = String(requirement?.source ?? '').trim();
  const text = String(requirement?.requirement ?? '').replace(/\s+/g, ' ').trim();
  return `sha256:${createHash('sha256').update(`${source}\n${text}`).digest('hex')}`;
}

export function loadCompletionReceiptLedger(path) {
  if (!fs.existsSync(path)) return { contract: COMPLETION_RECEIPT_CONTRACT, receipts: {} };
  const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (parsed?.contract !== COMPLETION_RECEIPT_CONTRACT || !parsed.receipts || typeof parsed.receipts !== 'object' || Array.isArray(parsed.receipts)) {
    throw new Error('SFI_COMPLETION_RECEIPT_LEDGER_INVALID');
  }
  return parsed;
}

function invalid(receipt, error, expectedHash) {
  return { state: 'INVALID', satisfied: false, receipt, error, expectedHash };
}

function validScopePath(value) {
  if (typeof value !== 'string') return false;
  const candidate = value.trim().replaceAll('\\', '/');
  if (!candidate || candidate.startsWith('/') || candidate.includes('../') || candidate === '..' || candidate.includes('\0')) return false;
  const wildcardIndex = candidate.indexOf('*');
  if (wildcardIndex < 0) return true;
  return candidate.endsWith('/*') || candidate.endsWith('/**')
    ? !candidate.slice(0, candidate.endsWith('/**') ? -3 : -2).includes('*')
    : false;
}

export function evaluateCompletionReceipt(requirement, ledger, options = {}) {
  const receipt = ledger?.receipts?.[requirement.id];
  if (!receipt) return { state: 'ABSENT', satisfied: false, receipt: null, error: null };

  const expectedHash = requirementHash(requirement);
  if (receipt.status !== 'SATISFIED') return invalid(receipt, 'RECEIPT_STATUS_NOT_SATISFIED', expectedHash);
  if (receipt.requirementHash !== expectedHash) return invalid(receipt, 'REQUIREMENT_HASH_MISMATCH', expectedHash);
  if (!Array.isArray(receipt.scopePaths) || receipt.scopePaths.length === 0 || receipt.scopePaths.some((value) => !validScopePath(value))) {
    return invalid(receipt, 'REGRESSION_SCOPE_REQUIRED', expectedHash);
  }
  if (typeof options.currentHead !== 'string' || !options.currentHead.trim()) return invalid(receipt, 'CURRENT_HEAD_REQUIRED', expectedHash);
  if (typeof receipt.head !== 'string' || !receipt.head.trim()) return invalid(receipt, 'VERIFIED_HEAD_REQUIRED', expectedHash);
  if (receipt.head !== options.currentHead) {
    if (typeof options.verifyReceiptHead !== 'function') return invalid(receipt, 'VERIFIED_HEAD_RESOLVER_REQUIRED', expectedHash);
    let relation;
    try { relation = options.verifyReceiptHead(receipt.head, options.currentHead, receipt); }
    catch (error) { relation = { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    if (relation !== true && relation?.ok !== true) return invalid(receipt, relation?.error || 'RECEIPT_HEAD_NOT_ADMISSIBLE', expectedHash);
  }
  if (receipt.verifiedBy !== 'SFI-08') return invalid(receipt, 'INDEPENDENT_VERIFIER_REQUIRED', expectedHash);
  if (receipt.returnState !== 'RETURN_PASS') return invalid(receipt, 'RETURN_PASS_REQUIRED', expectedHash);
  if (options.external === true && receipt.externalObserved !== true) return invalid(receipt, 'EXTERNAL_OBSERVATION_REQUIRED', expectedHash);
  if (!Array.isArray(receipt.evidence) || receipt.evidence.length === 0) return invalid(receipt, 'COMPLETION_EVIDENCE_REQUIRED', expectedHash);
  if (receipt.evidence.some((value) => !value || typeof value !== 'object' || Array.isArray(value) || typeof value.kind !== 'string' || typeof value.ref !== 'string' || !value.ref.trim())) {
    return invalid(receipt, 'STRUCTURED_EVIDENCE_REFERENCE_REQUIRED', expectedHash);
  }
  if (typeof options.verifyEvidence !== 'function') return invalid(receipt, 'EVIDENCE_RESOLVER_REQUIRED', expectedHash);

  const evidenceResults = receipt.evidence.map((evidence) => {
    try { return options.verifyEvidence(evidence, { receipt, requirement, currentHead: options.currentHead }); }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
  });
  if (evidenceResults.some((result) => result !== true && result?.ok !== true)) return invalid(receipt, 'OBSERVED_EVIDENCE_VERIFICATION_FAILED', expectedHash);

  return { state: 'VALID', satisfied: true, receipt, error: null, expectedHash, evidence: [...receipt.evidence], evidenceResults };
}
