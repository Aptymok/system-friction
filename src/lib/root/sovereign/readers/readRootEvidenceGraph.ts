import 'server-only';
import { canonicalEvidenceRow, canonicalizeEvidenceRows } from '@/lib/evidence/canonicalEvidence';
import type { RootEvidenceEdge, RootEvidenceNode, RootRow } from '../rootSovereignState';
import { dateValue, numberValue, selectRows, source, text } from './readerSupport';

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : [];
}

function record(value: unknown): RootRow {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as RootRow : {};
}

function nodeFrom(row: RootRow, table: string): RootEvidenceNode {
  const payload = record(row.payload ?? row.attributes);
  return {
    id: text(row.node_key ?? row.node_id ?? row.id),
    label: text(row.label ?? row.title, 'SIN ETIQUETA'),
    type: text(row.ontology_type ?? row.node_type ?? row.evidence_kind, 'evidence'),
    epistemicClass: text(row.epistemic_class ?? payload.epistemicClass, 'observed'),
    confidence: numberValue(row.confidence ?? row.trust_score ?? payload.confidence),
    source: table,
    observedAt: dateValue(payload.sourceObservedAt ?? row.observed_at ?? row.created_at ?? row.updated_at),
    evidenceIds: strings(row.evidence_ids ?? payload.evidenceIds).concat(text(row.evidence_hash ?? payload.evidenceHash, '') ? [text(row.evidence_hash ?? payload.evidenceHash)] : []),
    lineage: strings(row.lineage),
    payload,
  };
}

function edgeFrom(row: RootRow, table: string): RootEvidenceEdge {
  const attributes = record(row.attributes ?? row.payload);
  const declaredRelations = strings(attributes.declaredRelations);
  const semanticClasses = strings(attributes.semanticRelationTypes);
  return {
    id: text(row.edge_id ?? row.id),
    from: text(row.source_node_key ?? row.source_node_id ?? row.from_key),
    to: text(row.target_node_key ?? row.target_node_id ?? row.to_key),
    relation: declaredRelations.length ? declaredRelations.join(' · ') : text(row.relation ?? attributes.declaredRelation ?? row.relation_type ?? row.edge_type, 'related'),
    relationClass: semanticClasses.length ? semanticClasses.join(' · ') : text(attributes.semanticRelationType ?? row.relation_type ?? row.edge_type, 'related'),
    weight: numberValue(row.weight ?? row.w_ij),
    confidence: numberValue(row.confidence),
    observedAt: dateValue(attributes.observedAt ?? row.created_at ?? row.updated_at),
    evidenceIds: strings(row.evidence_ids).concat(strings(row.lineage)).concat(text(attributes.evidenceHash, '') ? [text(attributes.evidenceHash)] : []),
    source: table,
  };
}

function dedupeNodes(primary: RootEvidenceNode[], secondary: RootEvidenceNode[]) {
  const nodes = new Map<string, RootEvidenceNode>();
  for (const node of [...primary, ...secondary]) {
    if (!node.id.trim() || !node.label.trim() || nodes.has(node.id)) continue;
    nodes.set(node.id, node);
  }
  return [...nodes.values()];
}

function dedupeEdges(primary: RootEvidenceEdge[], secondary: RootEvidenceEdge[], nodeIds: Set<string>) {
  const edges = new Map<string, RootEvidenceEdge>();
  for (const edge of [...primary, ...secondary]) {
    if (!edge.id.trim() || !edge.from.trim() || !edge.to.trim()) continue;
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edges.has(edge.id)) continue;
    edges.set(edge.id, edge);
  }
  return [...edges.values()];
}

export async function readRootEvidenceGraph() {
  const [rootEntries, ledger, graphNodes, graphEdges, sfiNodes, sfiEdges] = await Promise.all([
    selectRows({ table: 'root_evidence_entries', select: 'id,evidence_hash,actor_id,title,content,evidence_type,target_node_id,payload,epistemic_event_id,created_at', order: 'created_at', limit: 500 }),
    selectRows({ table: 'sfi_evidence_ledger', select: 'id,case_id,module,evidence_kind,source_name,source_url,private_ref,public_summary,evidence_hash,anonymized,trust_level,trust_score,ldi,public_weight,observed_at,created_at', order: 'observed_at', limit: 500 }),
    selectRows({ table: 'graph_nodes', select: 'id,node_id,node_key,label,node_type,ontology_type,origin,epistemic_class,confidence,lineage,payload,attributes,created_at,updated_at', order: 'created_at', limit: 320 }),
    selectRows({ table: 'graph_edges', select: 'id,edge_id,source_node_id,target_node_id,source_node_key,target_node_key,relation,relation_type,weight,w_ij,confidence,lineage,payload,attributes,created_at,updated_at', order: 'created_at', limit: 640 }),
    selectRows({ table: 'sfi_graph_nodes', select: 'id,node_key,label,module,node_type,layer,parent_key,description,metrics,evidence_count,private_evidence_count,density,weight,degradation,status,position,visual,created_at,updated_at', order: 'created_at', limit: 220 }),
    selectRows({ table: 'sfi_graph_edges', select: 'id,from_key,to_key,edge_type,weight,evidence_count,degradation,metadata,created_at,updated_at', order: 'created_at', limit: 420 }),
  ]);

  const objects = canonicalizeEvidenceRows(rootEntries.rows, ledger.rows).map((item) => canonicalEvidenceRow(item) as RootRow);
  const primaryNodes = graphNodes.rows.map((item) => nodeFrom(item, 'graph_nodes'));
  const secondaryNodes = sfiNodes.rows.map((item) => nodeFrom(item, 'sfi_graph_nodes'));
  const nodes = dedupeNodes(primaryNodes, secondaryNodes);
  const nodeIds = new Set(nodes.map((item) => item.id));
  const primaryEdges = graphEdges.rows.map((item) => edgeFrom(item, 'graph_edges'));
  const secondaryEdges = sfiEdges.rows.map((item) => edgeFrom(item, 'sfi_graph_edges'));
  const edges = dedupeEdges(primaryEdges, secondaryEdges, nodeIds);
  const observedAt = objects.map((item) => dateValue(item.observed_at)).filter((value): value is string => Boolean(value)).sort().at(-1)
    ?? nodes.map((item) => item.observedAt).filter((value): value is string => Boolean(value)).sort().at(-1)
    ?? null;

  return source(
    { nodes, edges, objects, entries: rootEntries.rows, ledger: ledger.rows },
    'canonical evidence objects + persisted evidence graph',
    [rootEntries.error, ledger.error, graphNodes.error, graphEdges.error, sfiNodes.error, sfiEdges.error],
    observedAt,
    !objects.length && !nodes.length,
  );
}
