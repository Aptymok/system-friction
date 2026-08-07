import 'server-only';

import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []; }
function text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }
function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }

export async function reconcilePersistedEvidenceGraph() {
  const db = createServiceSupabaseClient();
  const [rootEvidence, ledger] = await Promise.all([
    db.from('root_evidence_entries')
      .select('id,evidence_hash,title,evidence_type,target_node_id,payload,epistemic_event_id,created_at')
      .order('created_at', { ascending: true })
      .limit(1000),
    db.from('sfi_evidence_ledger')
      .select('id,case_id,module,evidence_kind,source_name,evidence_hash,observed_at,created_at')
      .order('created_at', { ascending: true })
      .limit(1000),
  ]);

  const warnings = [rootEvidence.error?.message, ledger.error?.message].filter((value): value is string => Boolean(value));
  let nodesCreated = 0;
  let nodesUpdated = 0;
  let edgesCreated = 0;

  for (const item of rows(rootEvidence.data)) {
    const id = text(item.id);
    const hash = text(item.evidence_hash);
    if (!id || !hash) continue;
    const nodeId = `root_evidence:${hash.slice(0, 24)}`;
    const existing = await db.from('graph_nodes').select('id').eq('node_id', nodeId).maybeSingle();
    const eventId = text(item.epistemic_event_id);
    const payload = record(item.payload);
    const upsert = await db.from('graph_nodes').upsert({
      node_id: nodeId,
      label: text(item.title) ?? `Evidence ${id.slice(0, 8)}`,
      ontology_type: 'evidence',
      lineage: eventId ? [eventId] : [],
      attributes: {
        evidenceHash: hash,
        evidenceType: text(item.evidence_type) ?? 'root_evidence',
        rootEvidenceId: id,
        targetNodeId: text(item.target_node_id),
        epistemicClass: 'OBSERVED',
        observedObject: 'evidence_record_existence_and_provenance',
        sourcePayloadMetadata: record(payload.metadata),
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (upsert.error) { warnings.push(`root_evidence_graph:${id}:${upsert.error.message}`); continue; }
    if (existing.data) nodesUpdated += 1; else nodesCreated += 1;

    const targetNodeId = text(item.target_node_id);
    if (!targetNodeId) continue;
    const target = await db.from('graph_nodes').select('node_id').eq('node_id', targetNodeId).maybeSingle();
    if (!target.data || target.error) continue;
    const relationType = text(payload.relationType) ?? 'contextualizes';
    const edgeId = `${nodeId}->${targetNodeId}:${relationType}`;
    const existingEdge = await db.from('graph_edges').select('id').eq('edge_id', edgeId).maybeSingle();
    const edge = await db.from('graph_edges').upsert({
      edge_id: edgeId,
      source_node_id: nodeId,
      target_node_id: targetNodeId,
      relation: relationType,
      weight: 0,
      lineage: eventId ? [eventId] : [],
      attributes: { evidenceHash: hash, verified: false, epistemicClass: 'DECLARED', relationStrength: 'UNMEASURED', reconstructedFromPersistedEvidence: true },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edge_id' });
    if (edge.error) warnings.push(`root_evidence_edge:${id}:${edge.error.message}`);
    else if (!existingEdge.data) edgesCreated += 1;
  }

  for (const item of rows(ledger.data)) {
    const id = text(item.id);
    if (!id) continue;
    const hash = text(item.evidence_hash);
    const nodeId = `ledger_evidence:${hash ? hash.slice(0, 24) : id}`;
    const existing = await db.from('graph_nodes').select('id').eq('node_id', nodeId).maybeSingle();
    const upsert = await db.from('graph_nodes').upsert({
      node_id: nodeId,
      label: text(item.source_name) ?? text(item.evidence_kind) ?? `Ledger evidence ${id.slice(0, 8)}`,
      ontology_type: 'evidence',
      lineage: [],
      attributes: {
        evidenceHash: hash,
        ledgerEvidenceId: id,
        caseId: text(item.case_id),
        module: text(item.module),
        evidenceKind: text(item.evidence_kind),
        epistemicClass: 'IMPORTED',
        observedObject: 'ledger_record_existence_and_provenance',
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'node_id' });
    if (upsert.error) warnings.push(`ledger_evidence_graph:${id}:${upsert.error.message}`);
    else if (existing.data) nodesUpdated += 1; else nodesCreated += 1;
  }

  return { ok: warnings.length === 0, nodesCreated, nodesUpdated, edgesCreated, warnings: [...new Set(warnings)] };
}
