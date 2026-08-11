import { createHash } from 'node:crypto';
import { isEpistemicClass, type EpistemicClass } from '../../../packages/events/src/schema';

export type EvidenceRow = Record<string, unknown>;

export type CanonicalEvidenceObject = {
  key: string;
  nodeId: string;
  evidenceHash: string | null;
  label: string;
  module: string | null;
  caseId: string | null;
  evidenceKind: string | null;
  evidenceType: string | null;
  evidenceKey: string | null;
  sourceUrls: string[];
  privateRefs: string[];
  rootEvidenceIds: string[];
  ledgerEvidenceIds: string[];
  epistemicEventIds: string[];
  targetNodeIds: string[];
  observedAt: string | null;
  epistemicClass: EpistemicClass;
  confidence: number;
  provenance: Array<'root_evidence_entries' | 'sfi_evidence_ledger'>;
  metadata: EvidenceRow;
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): EvidenceRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as EvidenceRow : {};
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function number01(value: unknown, fallback = 1) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeEpistemicClass(value: unknown, fallback: EpistemicClass): EpistemicClass {
  const raw = text(value)?.toLowerCase();
  if (!raw) return fallback;
  if (isEpistemicClass(raw)) return raw as EpistemicClass;
  if (['imported_provenance', 'persisted_reference', 'provenance_observed'].includes(raw)) return 'imported';
  return fallback;
}

const EPISTEMIC_RANK: Record<EpistemicClass, number> = {
  canonical: 12,
  observed: 11,
  imported: 10,
  extracted: 9,
  derived: 8,
  declared: 7,
  inferred: 6,
  simulated: 5,
  proposed: 4,
  degraded: 3,
  conflicted: 2,
  missing: 1,
  rejected: 0,
};

function strongerEpistemicClass(a: EpistemicClass, b: EpistemicClass) {
  return EPISTEMIC_RANK[b] > EPISTEMIC_RANK[a] ? b : a;
}

function earlierDate(a: string | null, b: string | null) {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  if (Number.isFinite(left) && Number.isFinite(right)) return left <= right ? a : b;
  return Number.isFinite(left) ? a : Number.isFinite(right) ? b : null;
}

function shortHash(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function canonicalKey(source: 'root' | 'ledger', id: string, hash: string | null) {
  return hash ? `hash:${hash}` : `${source}:${id}`;
}

function nodeIdFor(key: string, hash: string | null) {
  return hash ? `evidence:${hash.slice(0, 24)}` : `evidence:${shortHash(key)}`;
}

function blank(key: string, hash: string | null): CanonicalEvidenceObject {
  return {
    key,
    nodeId: nodeIdFor(key, hash),
    evidenceHash: hash,
    label: 'Evidencia sin etiqueta',
    module: null,
    caseId: null,
    evidenceKind: null,
    evidenceType: null,
    evidenceKey: null,
    sourceUrls: [],
    privateRefs: [],
    rootEvidenceIds: [],
    ledgerEvidenceIds: [],
    epistemicEventIds: [],
    targetNodeIds: [],
    observedAt: null,
    epistemicClass: 'imported',
    confidence: 0,
    provenance: [],
    metadata: {},
  };
}

export function canonicalizeEvidenceRows(rootRows: EvidenceRow[], ledgerRows: EvidenceRow[]): CanonicalEvidenceObject[] {
  const objects = new Map<string, CanonicalEvidenceObject>();

  for (const row of rootRows) {
    const id = text(row.id);
    if (!id) continue;
    const hash = text(row.evidence_hash);
    const key = canonicalKey('root', id, hash);
    const payload = record(row.payload);
    const metadata = record(payload.metadata);
    const current = objects.get(key) ?? blank(key, hash);
    const epistemicClass = normalizeEpistemicClass(metadata.epistemicClass ?? payload.epistemicClass, 'observed');
    const observedAt = text(metadata.sourceObservedAt ?? payload.sourceObservedAt ?? row.created_at);
    const label = text(row.title) ?? current.label;

    objects.set(key, {
      ...current,
      evidenceHash: current.evidenceHash ?? hash,
      label,
      module: current.module ?? text(metadata.module),
      caseId: current.caseId ?? text(metadata.caseId),
      evidenceKind: current.evidenceKind ?? text(metadata.evidenceKind),
      evidenceType: current.evidenceType ?? text(row.evidence_type),
      evidenceKey: current.evidenceKey ?? text(metadata.evidenceKey),
      sourceUrls: unique([...current.sourceUrls, text(metadata.sourceUrl), text(payload.sourceUrl)]),
      privateRefs: unique([...current.privateRefs, text(metadata.privateRef), text(payload.privateRef)]),
      rootEvidenceIds: unique([...current.rootEvidenceIds, id]),
      epistemicEventIds: unique([...current.epistemicEventIds, text(row.epistemic_event_id)]),
      targetNodeIds: unique([...current.targetNodeIds, text(row.target_node_id)]),
      observedAt: earlierDate(current.observedAt, observedAt),
      epistemicClass: strongerEpistemicClass(current.epistemicClass, epistemicClass),
      confidence: Math.max(current.confidence, 1),
      provenance: current.provenance.includes('root_evidence_entries') ? current.provenance : [...current.provenance, 'root_evidence_entries'],
      metadata: { ...current.metadata, ...metadata },
    });
  }

  for (const row of ledgerRows) {
    const id = text(row.id);
    if (!id) continue;
    const hash = text(row.evidence_hash);
    const key = canonicalKey('ledger', id, hash);
    const summary = record(row.public_summary);
    const current = objects.get(key) ?? blank(key, hash);
    const epistemicClass = normalizeEpistemicClass(summary.epistemicClass ?? row.trust_level, 'imported');
    const observedAt = text(row.observed_at ?? row.created_at);
    const label = text(summary.title) ?? text(row.source_name) ?? text(row.evidence_kind) ?? current.label;

    objects.set(key, {
      ...current,
      evidenceHash: current.evidenceHash ?? hash,
      label: current.label === 'Evidencia sin etiqueta' ? label : current.label,
      module: current.module ?? text(row.module),
      caseId: current.caseId ?? text(row.case_id),
      evidenceKind: current.evidenceKind ?? text(row.evidence_kind),
      evidenceType: current.evidenceType,
      evidenceKey: current.evidenceKey ?? text(summary.evidenceKey),
      sourceUrls: unique([...current.sourceUrls, text(row.source_url)]),
      privateRefs: unique([...current.privateRefs, text(row.private_ref)]),
      ledgerEvidenceIds: unique([...current.ledgerEvidenceIds, id]),
      observedAt: earlierDate(current.observedAt, observedAt),
      epistemicClass: strongerEpistemicClass(current.epistemicClass, epistemicClass),
      confidence: Math.max(current.confidence, number01(row.trust_score, 1)),
      provenance: current.provenance.includes('sfi_evidence_ledger') ? current.provenance : [...current.provenance, 'sfi_evidence_ledger'],
      metadata: { ...current.metadata, publicSummary: summary },
    });
  }

  return [...objects.values()].sort((a, b) => {
    const left = a.observedAt ? Date.parse(a.observedAt) : Number.POSITIVE_INFINITY;
    const right = b.observedAt ? Date.parse(b.observedAt) : Number.POSITIVE_INFINITY;
    if (left !== right) return left - right;
    return a.label.localeCompare(b.label);
  });
}

export function canonicalEvidenceRow(object: CanonicalEvidenceObject): EvidenceRow {
  return {
    id: object.nodeId,
    evidence_hash: object.evidenceHash,
    title: object.label,
    module: object.module,
    case_id: object.caseId,
    evidence_kind: object.evidenceKind,
    evidence_type: object.evidenceType,
    evidence_key: object.evidenceKey,
    observed_at: object.observedAt,
    epistemic_class: object.epistemicClass,
    confidence: object.confidence,
    provenance: object.provenance,
    source_urls: object.sourceUrls,
    private_refs: object.privateRefs,
    root_evidence_ids: object.rootEvidenceIds,
    ledger_evidence_ids: object.ledgerEvidenceIds,
    epistemic_event_ids: object.epistemicEventIds,
    target_node_ids: object.targetNodeIds,
  };
}
