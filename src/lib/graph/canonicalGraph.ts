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
import { buildLibraryCorpusGraphProjection } from './libraryCorpusProjection';

type Row = Record<string, unknown>;

function now() {
  return new Date().toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

function profileFromAttributes(attributes: Record<string, unknown>) {
  return isGraphProfile(attributes.profile) ? attributes.profile : 'shared';
}

function visibleInProfile(itemProfile: GraphProfile, profile: GraphProfile) {
  return profile === 'shared' || itemProfile === profile || itemProfile === 'shared';
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
  const relation = stringValue(row.relation_type, row.relation, row.edge_type, row.type) ?? 'related_to';
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
  let service;

  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return stateFromProjection(
      profile,
      `graph_store_not_ready;library_projection_available;${error instanceof Error ? error.message : 'unknown'}`,
      libraryProjection,
    );
  }

  const [nodesResult, edgesResult] = await Promise.all([
    executeAbortableQuery(service.from('graph_nodes').select('*').order('created_at', { ascending: true })),
    executeAbortableQuery(service.from('graph_edges').select('*').order('created_at', { ascending: true })),
  ]);

  if (nodesResult.error || edgesResult.error) {
    return stateFromProjection(
      profile,
      `graph_store_read_failed;library_projection_available;${nodesResult.error?.message ?? edgesResult.error?.message ?? 'unknown'}`,
      libraryProjection,
    );
  }

  const persistedNodes = (Array.isArray(nodesResult.data) ? nodesResult.data : [])
    .map((row) => nodeFromRow(row as Row));
  const nodeIdByStoredId = new Map<string, string>();
  for (const rawNode of Array.isArray(nodesResult.data) ? nodesResult.data : []) {
    const node = nodeFromRow(rawNode as Row);
    for (const storedId of [rawNode.id, rawNode.node_id, rawNode.node_key, rawNode.key]) {
      const normalizedId = stringValue(storedId);
      if (normalizedId) nodeIdByStoredId.set(normalizedId, node.nodeId);
    }
  }
  const persistedEdges = (Array.isArray(edgesResult.data) ? edgesResult.data : [])
    .map((row) => edgeFromRow(row as Row, nodeIdByStoredId));

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
      nodes,
      edges,
      schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
      loadedAt: now(),
    };
  }

  return {
    profile,
    sourceState: 'observed',
    degradedReason: null,
    nodes,
    edges,
    schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
    loadedAt: now(),
  };
}

export function parseGraphProfile(value: string | null): GraphProfile {
  return isGraphProfile(value) ? value : 'shared';
}
