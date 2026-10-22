import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import {
  projectLedgerEvidence, projectOperationalEvent, projectRootEvidence,
  type InstitutionalEvidenceInventory,
} from './institutionalInventoryProjection';

/**
 * Read-only, bounded, institutional inventory.
 * Only safe metadata is selected; never fetch tenant case bodies, evidence payloads,
 * personal identifiers or model outputs. No source is admitted or promoted here.
 */
export async function readInstitutionalEvidenceInventory(limit = 20): Promise<InstitutionalEvidenceInventory> {
  const db = createServiceSupabaseClient();
  const bounded = Math.min(40, Math.max(1, Math.floor(Number.isFinite(limit) ? limit : 20)));
  const [root, ledger, events, rootCount, ledgerCount, eventCount] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,title,evidence_type,evidence_hash,created_at')
      .order('created_at', { ascending: false }).limit(bounded),
    db.from('sfi_evidence_ledger')
      .select('id,source_name,evidence_kind,evidence_hash,observed_at,created_at')
      .order('created_at', { ascending: false }).limit(bounded),
    db.from('epistemic_events')
      .select('event_id,event_name,epistemic_class,occurred_at')
      .order('occurred_at', { ascending: false }).limit(bounded),
    db.from('root_evidence_entries').select('id', { head: true, count: 'exact' }),
    db.from('sfi_evidence_ledger').select('id', { head: true, count: 'exact' }),
    db.from('epistemic_events').select('id', { head: true, count: 'exact' }),
  ]);
  const warnings = [
    root.error && `root_evidence_entries: ${root.error.message}`,
    ledger.error && `sfi_evidence_ledger: ${ledger.error.message}`,
    events.error && `epistemic_events: ${events.error.message}`,
    rootCount.error && `root_evidence_count: ${rootCount.error.message}`,
    ledgerCount.error && `sfi_evidence_count: ${ledgerCount.error.message}`,
    eventCount.error && `epistemic_events_count: ${eventCount.error.message}`,
  ].filter((value): value is string => typeof value === 'string');

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      rootEvidence: rootCount.error ? null : (rootCount.count ?? null),
      ledgerEvidence: ledgerCount.error ? null : (ledgerCount.count ?? null),
      operationalEvents: eventCount.error ? null : (eventCount.count ?? null),
    },
    items: [
      ...(root.data ?? []).map((entry) => projectRootEvidence(entry)),
      ...(ledger.data ?? []).map((entry) => projectLedgerEvidence(entry)),
      ...(events.data ?? []).map((entry) => projectOperationalEvent(entry)),
    ],
    sampleLimitPerSource: bounded,
    exhaustive: false,
    warnings,
    boundary: 'Read-only inventory. Event traces are not admitted evidence; ROOT capture and ledger records do not verify claims by themselves. Tenant case contents remain outside this inventory. No automatic Method Lab eligibility or canon promotion.',
  };
}
