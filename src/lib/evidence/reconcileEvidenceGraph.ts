import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { isEpistemicClass, type EpistemicClass } from '../../../packages/events/src/schema';

type Row = Record<string, unknown>;
type FetchResult = { data: Row[]; error: string | null };

const PAGE_SIZE = 500;

function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Row =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Row)
    : {};
}

function number01(value: unknown, fallback = 1) {
  if (value === null || typeof value === 'undefined' || value === '') {
    return fallback;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

function normalizeEpistemicClass(
  value: unknown,
  fallback: EpistemicClass
): EpistemicClass {
  const raw = text(value)?.toLowerCase();
  if (!raw) return fallback;
  if (isEpistemicClass(raw)) return raw as EpistemicClass;

  if (
    raw === 'imported_provenance' ||
    raw === 'persisted_reference' ||
    raw === 'provenance_observed'
  ) {
    return 'imported';
  }

  return fallback;
}

function sourceEpistemicClass(value: unknown) {
  return text(value) ?? null;
}

export async function reconcilePersistedEvidenceGraph() {
  const db = createServiceSupabaseClient();

  async function fetchAllRows(
    table: 'root_evidence_entries' | 'sfi_evidence_ledger',
    select: string
  ): Promise<FetchResult> {
    const collected: Row[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await db
        .from(table)
        .select(select)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (page.error) {
        return { data: [], error: page.error.message };
      }

      const pageRows = rows(page.data);
      collected.push(...pageRows);

      if (pageRows.length < PAGE_SIZE) {
        return { data: collected, error: null };
      }
    }
  }

  const [rootEvidence, ledger] = await Promise.all([
    fetchAllRows(
      'root_evidence_entries',
      'id,evidence_hash,title,evidence_type,target_node_id,payload,epistemic_event_id,created_at'
    ),
    fetchAllRows(
      'sfi_evidence_ledger',
      'id,case_id,module,evidence_kind,source_name,evidence_hash,public_summary,trust_level,trust_score,observed_at,created_at'
    ),
  ]);

  const warnings = [rootEvidence.error, ledger.error].filter(
    (value): value is string => Boolean(value)
  );
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;

  for (const item of rootEvidence.data) {
    const id = text(item.id);
    const hash = text(item.evidence_hash);
    if (!id || !hash) continue;

    const nodeId = `root_evidence:${hash.slice(0, 24)}`;
    const existing = await db
      .from('graph_nodes')
      .select('id')
      .eq('node_id', nodeId)
      .maybeSingle();
    const eventId = text(item.epistemic_event_id);
    const payload = record(item.payload);
    const metadata = record(payload.metadata);
    const declaredEpistemicClass =
      metadata.epistemicClass ?? payload.epistemicClass;
    const epistemicClass = normalizeEpistemicClass(
      declaredEpistemicClass,
      'observed'
    );
    const observedObject =
      epistemicClass === 'imported'
        ? 'imported_evidence_record_existence_and_provenance'
        : 'evidence_record_existence_and_provenance';
    const nodePayload = {
      evidenceHash: hash,
      evidenceType: text(item.evidence_type) ?? 'root_evidence',
      rootEvidenceId: id,
      targetNodeId: text(item.target_node_id),
      epistemicClass: epistemicClass.toUpperCase(),
      sourceEpistemicClass: sourceEpistemicClass(declaredEpistemicClass),
      observedObject,
      sourcePayloadMetadata: metadata,
    };
    const upsert = await db.from('graph_nodes').upsert(
      {
        node_id: nodeId,
        node_key: nodeId,
        label: text(item.title) ?? `Evidence ${id.slice(0, 8)}`,
        node_type: 'INF',
        ontology_type: 'evidence',
        origin: 'root_evidence',
        epistemic_class: epistemicClass,
        confidence: 1,
        payload: nodePayload,
        lineage: eventId ? [eventId] : [],
        attributes: nodePayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'node_id' }
    );
    if (upsert.error) {
      warnings.push(`root_evidence_graph:${id}:${upsert.error.message}`);
      continue;
    }
    if (existing.data) nodesUpdated += 1;
    else nodesCreated += 1;

    const targetNodeId = text(item.target_node_id);
    if (!targetNodeId) continue;
    const target = await db
      .from('graph_nodes')
      .select('node_id,node_key')
      .or(`node_id.eq.${targetNodeId},node_key.eq.${targetNodeId}`)
      .maybeSingle();
    if (!target.data || target.error) continue;
    const resolvedTarget = text(target.data.node_id ?? target.data.node_key);
    if (!resolvedTarget) continue;

    const relation = text(payload.relationType) ?? 'contextualizes';
    const edgeId = `${nodeId}->${resolvedTarget}:${relation}`;
    const existingEdge = await db
      .from('graph_edges')
      .select('id')
      .eq('edge_id', edgeId)
      .maybeSingle();
    const edgePayload = {
      evidenceHash: hash,
      verified: false,
      epistemicClass: 'DECLARED',
      relationStrength: 'UNMEASURED',
      declaredRelation: relation,
      reconstructedFromPersistedEvidence: true,
    };
    const edge = await db.from('graph_edges').upsert(
      {
        edge_id: edgeId,
        source_node_id: nodeId,
        target_node_id: resolvedTarget,
        source_node_key: nodeId,
        target_node_key: resolvedTarget,
        relation,
        relation_type: 'structural_inferred',
        weight: 0,
        w_ij: 0,
        confidence: 0,
        lineage: eventId ? [eventId] : [],
        evidence_ids: eventId ? [eventId] : [],
        payload: edgePayload,
        attributes: edgePayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'edge_id' }
    );
    if (edge.error) {
      warnings.push(`root_evidence_edge:${id}:${edge.error.message}`);
    } else if (!existingEdge.data) {
      edgesCreated += 1;
    }
  }

  for (const item of ledger.data) {
    const id = text(item.id);
    if (!id) continue;

    const hash = text(item.evidence_hash);
    const nodeId = `ledger_evidence:${hash ? hash.slice(0, 24) : id}`;
    const existing = await db
      .from('graph_nodes')
      .select('id')
      .eq('node_id', nodeId)
      .maybeSingle();
    const publicSummary = record(item.public_summary);
    const declaredEpistemicClass =
      publicSummary.epistemicClass ?? item.trust_level;
    const epistemicClass = normalizeEpistemicClass(
      declaredEpistemicClass,
      'imported'
    );
    const confidence = number01(item.trust_score, 1);
    const nodePayload = {
      evidenceHash: hash,
      ledgerEvidenceId: id,
      caseId: text(item.case_id),
      module: text(item.module),
      evidenceKind: text(item.evidence_kind),
      epistemicClass: epistemicClass.toUpperCase(),
      sourceEpistemicClass: sourceEpistemicClass(declaredEpistemicClass),
      observedObject:
        epistemicClass === 'imported'
          ? 'imported_ledger_record_existence_and_provenance'
          : 'ledger_record_existence_and_provenance',
    };
    const upsert = await db.from('graph_nodes').upsert(
      {
        node_id: nodeId,
        node_key: nodeId,
        label:
          text(item.source_name) ??
          text(item.evidence_kind) ??
          `Ledger evidence ${id.slice(0, 8)}`,
        node_type: 'INF',
        ontology_type: 'evidence',
        origin: 'evidence_ledger',
        epistemic_class: epistemicClass,
        confidence,
        payload: nodePayload,
        lineage: [],
        attributes: nodePayload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'node_id' }
    );
    if (upsert.error) {
      warnings.push(`ledger_evidence_graph:${id}:${upsert.error.message}`);
    } else if (existing.data) {
      nodesUpdated += 1;
    } else {
      nodesCreated += 1;
    }
  }

  return {
    ok: warnings.length === 0,
    rootEvidenceRows: rootEvidence.data.length,
    ledgerRows: ledger.data.length,
    nodesCreated,
    nodesUpdated,
    edgesCreated,
    warnings: [...new Set(warnings)],
  };
}
