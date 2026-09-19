import {
  graphEdgeJsonSchema,
  graphNodeJsonSchema,
  isGraphProfile,
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalGraphState,
  type GraphProfile,
} from '../../../packages/graph/src';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';
import { executeAbortableQuery } from '@/lib/supabase/abortableQuery';
import { isSfiContinuityConfigured, readContinuityCanonicalGraphRows } from '@/lib/sfi/continuityPostgres';
import { buildLibraryCorpusGraphProjection } from './libraryCorpusProjection';

type Row = Record<string, unknown>;

const GRAPH_NODE_HYBRID_READ_FIELDS = 'id,node_id,node_key,label,node_type,ontology_type,profile,origin,attributes,lineage,created_at,updated_at';
const GRAPH_EDGE_HYBRID_READ_FIELDS = 'id,edge_id,source_node_id,target_node_id,source_node_key,target_node_key,relation,relation_type,weight,w_ij,attributes,lineage,created_at,updated_at';
const GRAPH_NODE_CANONICAL_READ_FIELDS = 'id,node_id,label,ontology_type,attributes,lineage,created_at,updated_at';
const GRAPH_EDGE_CANONICAL_READ_FIELDS = 'id,edge_id,source_node_id,target_node_id,relation,weight,attributes,lineage,created_at,updated_at';

function now() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function rowsFromUnknown(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

function stringValues(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
}

function semanticRelation(row: Row, attributes: Record<string, unknown>) {
  const declaredRelations = stringValues(attributes.declaredRelations);
  if (declaredRelations.length) return declaredRelations.join(' · ');
  return stringValue(
    row.relation,
    attributes.declaredRelation,
    attributes.semanticRelationType,
    row.relation_type,
    row.edge_type,
    row.type,
  ) ?? 'related_to';
}

function profileFromAttributes(attributes: Record<string, unknown>) {
  return isGraphProfile(attributes.profile) ? attributes.profile : 'shared';
}

function visibleInProfile(itemProfile: GraphProfile, profile: GraphProfile) {
  return profile === 'shared' || itemProfile === profile || itemProfile === 'shared';
}

function isMissingGraphColumn(value: unknown) {
  const error = asRecord(value);
  return error.code === '42703' || error.code === 'PGRST204';
}

async function readSupabaseGraphRows() {
  const service = createServiceSupabaseClient();

  const read = async (nodeFields: string, edgeFields: string) => {
    const [nodesResult, edgesResult] = await Promise.all([
      executeAbortableQuery(service.from('graph_nodes').select(nodeFields).order('created_at', { ascending: true })),
      executeAbortableQuery(service.from('graph_edges').select(edgeFields).order('created_at', { ascending: true })),
    ]);
    const error = nodesResult.error ?? edgesResult.error ?? null;
    return {
      nodes: !nodesResult.error ? rowsFromUnknown(nodesResult.data) : [],
      edges: !edgesResult.error ? rowsFromUnknown(edgesResult.data) : [],
      error,
    };
  };

  const hybrid = await read(GRAPH_NODE_HYBRID_READ_FIELDS, GRAPH_EDGE_HYBRID_READ_FIELDS);
  if (!hybrid.error || !isMissingGraphColumn(hybrid.error)) return hybrid;

  return read(GRAPH_NODE_CANONICAL_READ_FIELDS, GRAPH_EDGE_CANONICAL_READ_FIELDS);
}

function stateFromProjection(profile: GraphProfile, reason: string, projection = buildLibraryCorpusGraphProjection()): CanonicalGraphState {
  const nodes = projection.nodes.filter((node) => visibleInProfile(node.profile, profile));
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edges = projection.edges
    .filter((edge) => visibleInProfile(edge.profile, profile))
    .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));
  return {
    profile,
    sourceState: 'degraded',
    degradedReason: reason,
    readPlane: 'PROJECTION',
    primaryDiagnostic: reason,
    nodes,
    edges,
    schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
    loadedAt: now(),
  };
}

export function emptyCanonicalGraph(profile: GraphProfile, reason: string): CanonicalGraphState {
  return {
    profile,
    sourceState: 'degraded',
    degradedReason: reason,
    readPlane: 'UNAVAILABLE',
    primaryDiagnostic: reason,
    nodes: [],
    edges: [],
    schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
    loadedAt: now(),
  };
}

function nodeFromRow(row: Row): CanonicalGraphNode {
  const attributes = asRecord(row.attributes ?? row.payload ?? row.metadata);
  const createdAt = typeof row.created_at === 'string' ? row.created_at : now();
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : createdAt;
  const nodeId = stringValue(row.node_id, row.node_key, row.key, row.id) ?? 'unknown';

  return {
    nodeId,
    label: stringValue(row.label, row.name, nodeId) ?? nodeId,
    ontologyType: stringValue(row.ontology_type, row.node_type, row.type) ?? 'unknown',
    profile: isGraphProfile(row.profile) ? row.profile : profileFromAttributes(attributes),
    origin: stringValue(row.origin, attributes.origin) ?? 'database',
    provenance: stringValue(row.provenance, attributes.provenance) ?? 'graph_nodes',
    lineage: Array.isArray(row.lineage) ? row.lineage.filter((item): item is string => typeof item === 'string') : [],
    attributes,
    createdAt,
    updatedAt,
  };
}

function edgeFromRow(row: Row, nodeIdByStoredId: Map<string, string>): CanonicalGraphEdge {
  const attributes = asRecord(row.attributes ?? row.payload ?? row.metadata);
  const createdAt = typeof row.created_at === 'string' ? row.created_at : now();
  const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : createdAt;
  const relation = semanticRelation(row, attributes);
  const rawSourceNodeId = stringValue(row.source_node_key, row.source_node_id, row.source_id, row.from_node_id, row.from_id, row.source, row.from);
  const rawTargetNodeId = stringValue(row.target_node_key, row.target_node_id, row.target_id, row.to_node_id, row.to_id, row.target, row.to);
  const sourceNodeId = rawSourceNodeId ? nodeIdByStoredId.get(rawSourceNodeId) ?? rawSourceNodeId : '';
  const targetNodeId = rawTargetNodeId ? nodeIdByStoredId.get(rawTargetNodeId) ?? rawTargetNodeId : '';
  const weightValue = row.w_ij ?? row.weight ?? 0;

  return {
    edgeId: stringValue(row.edge_id, row.edge_key, row.key, row.id) ?? `${sourceNodeId}:${targetNodeId}:${relation}`,
    sourceNodeId,
    targetNodeId,
    relation,
    weight: Math.max(0, Math.min(1, Number(weightValue))),
    profile: isGraphProfile(row.profile) ? row.profile : profileFromAttributes(attributes),
    origin: stringValue(row.origin, attributes.origin) ?? 'database',
    provenance: stringValue(row.provenance, attributes.provenance) ?? 'graph_edges',
    lineage: Array.isArray(row.lineage) ? row.lineage.filter((item): item is string => typeof item === 'string') : [],
    attributes,
    createdAt,
    updatedAt,
  };
}

export async function readCanonicalGraphState(profile: GraphProfile): Promise<CanonicalGraphState> {
  const libraryProjection = buildLibraryCorpusGraphProjection();
  let rawNodeRows: Row[] = [];
  let rawEdgeRows: Row[] = [];
  let continuityServed = false;
  let primaryDiagnostic: string | null = null;

  try {
    const primary = await readSupabaseGraphRows();
    if (!primary.error) {
      rawNodeRows = primary.nodes;
      rawEdgeRows = primary.edges;
    } else {
      primaryDiagnostic = primary.error.message ?? 'graph_store_read_failed';
    }
  } catch (error) {
    primaryDiagnostic = error instanceof Error ? error.message : 'graph_store_not_ready';
  }

  if (primaryDiagnostic && isSfiContinuityConfigured()) {
    try {
      const fallback = await readContinuityCanonicalGraphRows();
      if (fallback) {
        rawNodeRows = fallback.nodes as Row[];
        rawEdgeRows = fallback.edges as Row[];
        continuityServed = true;
      }
    } catch (error) {
      primaryDiagnostic = `${primaryDiagnostic};continuity=${error instanceof Error ? error.message : 'continuity_graph_read_failed'}`;
    }
  }

  if (primaryDiagnostic && !continuityServed && rawNodeRows.length === 0 && rawEdgeRows.length === 0) {
    return stateFromProjection(
      profile,
      `graph_store_read_failed;library_projection_available;${primaryDiagnostic}`,
      libraryProjection,
    );
  }

  const persistedNodes = rawNodeRows.map((row) => nodeFromRow(row));
  const nodeIdByStoredId = new Map<string, string>();
  for (const rawNode of rawNodeRows) {
    const node = nodeFromRow(rawNode as Row);
    for (const storedId of [rawNode.id, rawNode.node_id, rawNode.node_key, rawNode.key]) {
      const normalizedId = stringValue(storedId);
      if (normalizedId) nodeIdByStoredId.set(normalizedId, node.nodeId);
    }
  }
  const persistedEdges = rawEdgeRows.map((row) => edgeFromRow(row, nodeIdByStoredId));

  const mergedNodes = new Map<string, CanonicalGraphNode>();
  for (const node of libraryProjection.nodes) mergedNodes.set(node.nodeId, node);
  for (const node of persistedNodes) mergedNodes.set(node.nodeId, node);

  const mergedEdges = new Map<string, CanonicalGraphEdge>();
  for (const edge of libraryProjection.edges) mergedEdges.set(edge.edgeId, edge);
  for (const edge of persistedEdges) mergedEdges.set(edge.edgeId, edge);

  const nodes = [...mergedNodes.values()].filter((node) => visibleInProfile(node.profile, profile));
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edges = [...mergedEdges.values()]
    .filter((edge) => visibleInProfile(edge.profile, profile))
    .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId));

  const persistedVisibleNodes = persistedNodes.filter((node) => visibleInProfile(node.profile, profile));
  const persistedVisibleNodeIds = new Set(persistedVisibleNodes.map((node) => node.nodeId));
  const persistedVisibleEdges = persistedEdges
    .filter((edge) => visibleInProfile(edge.profile, profile))
    .filter((edge) => persistedVisibleNodeIds.has(edge.sourceNodeId) && persistedVisibleNodeIds.has(edge.targetNodeId));

  if (persistedVisibleNodes.length === 0) {
    return {
      profile,
      sourceState: 'degraded',
      degradedReason: 'graph_store_empty;declared_library_projection_available;persisted_graph_reconciliation_still_required',
      readPlane: continuityServed ? 'NEON' : 'SUPABASE',
      primaryDiagnostic,
      nodes,
      edges,
      schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
      loadedAt: now(),
    };
  }

  if (persistedVisibleEdges.length === 0) {
    return {
      profile,
      sourceState: 'degraded',
      degradedReason: 'graph_edges_empty;declared_library_projection_available;persisted_graph_reconciliation_still_required',
      readPlane: continuityServed ? 'NEON' : 'SUPABASE',
      primaryDiagnostic,
      nodes,
      edges,
      schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
      loadedAt: now(),
    };
  }

  return {
    profile,
    sourceState: 'observed',
    degradedReason: continuityServed
      ? `primary_graph_read_unavailable_continuity_served;${primaryDiagnostic ?? 'unknown'}`
      : null,
    readPlane: continuityServed ? 'NEON' : 'SUPABASE',
    primaryDiagnostic,
    nodes,
    edges,
    schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
    loadedAt: now(),
  };
}

export function parseGraphProfile(value: string | null): GraphProfile {
  return isGraphProfile(value) ? value : 'shared';
}
