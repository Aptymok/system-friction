/**
 * Presentation-only institutional evidence inventory.
 * An operational trace is not promoted to institutional evidence by being listed.
 * Projections intentionally drop arbitrary JSON payload, actor identifiers and raw case content.
 */
export type InventorySource = 'root_evidence_entries' | 'sfi_evidence_ledger' | 'epistemic_events';
export type InventoryAdmission = 'ROOT_CAPTURED_UNVERIFIED_CLAIMS' | 'LEDGER_RECORDED_CHECK_STATUS' | 'EVENT_NOT_ADMITTED';
export type InstitutionalInventoryItem = {
  ref: string;
  title: string;
  source: InventorySource;
  kind: string;
  epistemicClass: string;
  admission: InventoryAdmission;
  recordedAt: string | null;
  contentHash: string | null;
};
export type InstitutionalEvidenceInventory = {
  generatedAt: string;
  totals: { rootEvidence: number | null; ledgerEvidence: number | null; operationalEvents: number | null };
  items: InstitutionalInventoryItem[];
  sampleLimitPerSource: number;
  exhaustive: false;
  warnings: string[];
  boundary: string;
};
type Row = Record<string, unknown>;
const string = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const at = (value: unknown) => string(value) || null;

export function projectRootEvidence(item: Row): InstitutionalInventoryItem {
  return {
    ref: string(item.id), title: string(item.title) || 'Untitled ROOT evidence record',
    source: 'root_evidence_entries', kind: string(item.evidence_type) || 'root_evidence',
    epistemicClass: 'CAPTURED', admission: 'ROOT_CAPTURED_UNVERIFIED_CLAIMS',
    recordedAt: at(item.created_at), contentHash: at(item.evidence_hash),
  };
}
export function projectLedgerEvidence(item: Row): InstitutionalInventoryItem {
  return {
    ref: string(item.id), title: string(item.source_name) || 'Institutional ledger item',
    source: 'sfi_evidence_ledger', kind: string(item.evidence_kind) || 'evidence',
    epistemicClass: 'RECORDED', admission: 'LEDGER_RECORDED_CHECK_STATUS',
    recordedAt: at(item.observed_at) ?? at(item.created_at), contentHash: at(item.evidence_hash),
  };
}
export function projectOperationalEvent(item: Row): InstitutionalInventoryItem {
  return {
    ref: string(item.event_id), title: string(item.event_name) || 'Unnamed operational event',
    source: 'epistemic_events', kind: 'EVENT_TRACE',
    epistemicClass: string(item.epistemic_class) || 'UNKNOWN',
    admission: 'EVENT_NOT_ADMITTED', recordedAt: at(item.occurred_at),
    contentHash: null,
  };
}
