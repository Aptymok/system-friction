import 'server-only';
import type { RootEvidenceEdge, RootEvidenceNode, RootRow } from '../rootSovereignState';
import { dateValue, numberValue, selectRows, source, text } from './readerSupport';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function nodeFrom(row: RootRow, table: string): RootEvidenceNode {
  const payload = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload) ? row.payload as RootRow : {};
  return {
    id: text(row.node_key ?? row.node_id ?? row.id),
    label: text(row.label ?? row.title, 'SIN ETIQUETA'),
    type: text(row.ontology_type ?? row.node_type ?? row.evidence_kind, 'evidence'),
    epistemicClass: text(row.epistemic_class, 'observed'),
    confidence: numberValue(row.confidence ?? row.trust_score),
    source: table,
    observedAt: dateValue(row.updated_at ?? row.observed_at ?? row.created_at),
    evidenceIds: strings(row.evidence_ids).concat(text(row.evidence_hash, '') ? [text(row.evidence_hash)] : []),
    lineage: strings(row.lineage),
    payload,
  };
}

function edgeFrom(row: RootRow, table: string): RootEvidenceEdge {
  return {
    id: text(row.edge_id ?? row.id),
    from: text(row.source_node_key ?? row.source_node_id ?? row.from_key),
    to: text(row.target_node_key ?? row.target_node_id ?? row.to_key),
    relation: text(row.relation_type ?? row.relation ?? row.edge_type, 'related'),
    weight: numberValue(row.weight ?? row.w_ij),
    confidence: numberValue(row.confidence),
    evidenceIds: strings(row.evidence_ids),
    source: table,
  };
}

export async function readRootEvidenceGraph() {
  const [rootEntries, ledger, graphNodes, graphEdges, sfiNodes, sfiEdges] = await Promise.all([
    selectRows({ table: 'root_evidence_entries', select: 'id,evidence_hash,actor_id,title,content,evidence_type,target_node_id,payload,epistemic_event_id,created_at', order: 'created_at', limit: 80 }),
    selectRows({ table: 'sfi_evidence_ledger', select: 'id,case_id,module,evidence_kind,source_name,source_url,private_ref,public_summary,evidence_hash,anonymized,trust_level,trust_score,ldi,public_weight,observed_at,created_at', order: 'observed_at', limit: 80 }),
    selectRows({ table: 'graph_nodes', select: 'id,node_id,label,ontology_type,lineage,attributes,created_at,updated_at', order: 'updated_at', limit: 120 }),
    selectRows({ table: 'graph_edges', select: 'id,edge_id,source_node_id,target_node_id,relation,weight,lineage,attributes,created_at,updated_at', order: 'updated_at', limit: 180 }),
    selectRows({ table: 'sfi_graph_nodes', select: 'id,node_key,label,module,node_type,layer,parent_key,description,metrics,evidence_count,private_evidence_count,density,weight,degradation,status,position,visual,created_at,updated_at', order: 'updated_at', limit: 120 }),
    selectRows({ table: 'sfi_graph_edges', select: 'id,from_key,to_key,edge_type,weight,evidence_count,degradation,metadata,created_at,updated_at', order: 'updated_at', limit: 180 }),
  ]);
  const nodes = [...graphNodes.rows.map((item) => nodeFrom(item, 'graph_nodes')), ...sfiNodes.rows.map((item) => nodeFrom(item, 'sfi_graph_nodes'))].filter((item) => item.id);
  const edges = [...graphEdges.rows.map((item) => edgeFrom(item, 'graph_edges')), ...sfiEdges.rows.map((item) => edgeFrom(item, 'sfi_graph_edges'))].filter((item) => item.id && item.from && item.to);
  return source({ nodes, edges, entries: rootEntries.rows, ledger: ledger.rows }, 'persisted evidence graphs', [rootEntries.error, ledger.error, graphNodes.error, graphEdges.error, sfiNodes.error, sfiEdges.error], nodes.map((item) => item.observedAt).find(Boolean) ?? null, !nodes.length && !rootEntries.rows.length);
}
