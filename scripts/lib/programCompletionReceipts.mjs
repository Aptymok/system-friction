import { createHash } from 'node:crypto';
import fs from 'node:fs';

export const COMPLETION_RECEIPT_CONTRACT = 'SFI-PROGRAM-COMPLETION-RECEIPTS-1.0';

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

export function evaluateCompletionReceipt(requirement, ledger, options = {}) {
  const receipt = ledger?.receipts?.[requirement.id];
  if (!receipt) return { state: 'ABSENT', satisfied: false, receipt: null, error: null };

  const expectedHash = requirementHash(requirement);
  if (receipt.status !== 'SATISFIED') {
    return { state: 'INVALID', satisfied: false, receipt, error: 'RECEIPT_STATUS_NOT_SATISFIED', expectedHash };
  }
  if (receipt.requirementHash !== expectedHash) {
    return { state: 'INVALID', satisfied: false, receipt, error: 'REQUIREMENT_HASH_MISMATCH', expectedHash };
  }
  if (!Array.isArray(receipt.evidence) || receipt.evidence.length === 0 || receipt.evidence.some((value) => typeof value !== 'string' || !value.trim())) {
    return { state: 'INVALID', satisfied: false, receipt, error: 'COMPLETION_EVIDENCE_REQUIRED', expectedHash };
  }
  if (typeof receipt.verifiedBy !== 'string' || !receipt.verifiedBy.trim()) {
    return { state: 'INVALID', satisfied: false, receipt, error: 'VERIFIER_REQUIRED', expectedHash };
  }
  if (receipt.returnState !== 'RETURN_PASS') {
    return { state: 'INVALID', satisfied: false, receipt, error: 'RETURN_PASS_REQUIRED', expectedHash };
  }
  if (options.external === true && receipt.externalObserved !== true) {
    return { state: 'INVALID', satisfied: false, receipt, error: 'EXTERNAL_OBSERVATION_REQUIRED', expectedHash };
  }

  return {
    state: 'VALID',
    satisfied: true,
    receipt,
    error: null,
    expectedHash,
    evidence: [...receipt.evidence],
  };
}
