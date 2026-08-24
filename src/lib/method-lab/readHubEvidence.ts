import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

export type MethodLabEvidenceOption = {
  id: string;
  label: string;
  kind: string;
  source: 'root_evidence_entries' | 'sfi_evidence_ledger';
  caseId: string | null;
  observedAt: string | null;
  claimBoundary: string | null;
};

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export async function readMethodLabEvidenceOptions(limit = 80) {
  const db = createServiceSupabaseClient();
  const bounded = Math.min(Math.max(limit, 1), 120);

  const [rootEvidence, evidenceLedger] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,title,evidence_type,created_at,payload')
      .order('created_at', { ascending: false })
      .limit(bounded),
    db.from('sfi_evidence_ledger')
      .select('id,case_id,module,evidence_kind,source_name,observed_at,created_at,public_summary')
      .order('observed_at', { ascending: false, nullsFirst: false })
      .limit(bounded),
  ]);

  const options: MethodLabEvidenceOption[] = [];
  const seen = new Set<string>();

  for (const item of (rootEvidence.data ?? []) as Row[]) {
    const id = text(item.id);
    if (!id || seen.has(id)) continue;
    const payload = row(item.payload);
    const metadata = row(payload.metadata);
    seen.add(id);
    options.push({
      id,
      label: text(item.title) || text(payload.title) || id,
      kind: text(item.evidence_type) || text(payload.evidenceType) || 'evidence',
      source: 'root_evidence_entries',
      caseId: text(metadata.caseId) || null,
      observedAt: text(metadata.sourceObservedAt) || text(item.created_at) || null,
      claimBoundary: text(metadata.claimBoundary) || null,
    });
  }

  for (const item of (evidenceLedger.data ?? []) as Row[]) {
    const id = text(item.id);
    if (!id || seen.has(id)) continue;
    const summary = row(item.public_summary);
    seen.add(id);
    options.push({
      id,
      label: text(summary.title) || `${text(item.case_id) || 'CASE'} · ${text(item.evidence_kind) || 'evidence'}`,
      kind: text(item.evidence_kind) || text(item.module) || 'evidence',
      source: 'sfi_evidence_ledger',
      caseId: text(item.case_id) || null,
      observedAt: text(item.observed_at) || text(item.created_at) || null,
      claimBoundary: text(summary.claimBoundary) || null,
    });
  }

  return {
    options: options.slice(0, bounded),
    warnings: [
      rootEvidence.error ? `root_evidence_entries:${rootEvidence.error.message}` : null,
      evidenceLedger.error ? `sfi_evidence_ledger:${evidenceLedger.error.message}` : null,
    ].filter((value): value is string => Boolean(value)),
  };
}
