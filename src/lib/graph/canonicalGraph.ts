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
  let service;

  try {
    service = createServiceSupabaseClient();
  } catch (error) {
    return emptyCanonicalGraph(profile, error instanceof Error ? error.message : 'graph_store_not_ready');
  }

  const [nodesResult, edgesResult] = await Promise.all([
    executeAbortableQuery(service.from('graph_nodes').select('*').order('created_at', { ascending: true })),
    executeAbortableQuery(service.from('graph_edges').select('*').order('created_at', { ascending: true })),
  ]);

  if (nodesResult.error || edgesResult.error) {
    return emptyCanonicalGraph(profile, nodesResult.error?.message ?? edgesResult.error?.message ?? 'graph_store_read_failed');
  }

  const nodes = (Array.isArray(nodesResult.data) ? nodesResult.data : [])
    .map((row) => nodeFromRow(row as Row))
    .filter((node) => profile === 'shared' || node.profile === profile || node.profile === 'shared');
  const nodeIdByStoredId = new Map<string, string>();
  for (const rawNode of Array.isArray(nodesResult.data) ? nodesResult.data : []) {
    const node = nodeFromRow(rawNode as Row);
    for (const storedId of [rawNode.id, rawNode.node_id, rawNode.node_key, rawNode.key]) {
      const normalizedId = stringValue(storedId);
      if (normalizedId) {
        nodeIdByStoredId.set(normalizedId, node.nodeId);
      }
    }
  }
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edges = (Array.isArray(edgesResult.data) ? edgesResult.data : [])
    .map((row) => edgeFromRow(row as Row, nodeIdByStoredId))
    .filter((edge) => nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId))
    .filter((edge) => profile === 'shared' || edge.profile === profile || edge.profile === 'shared');

  if (nodes.length === 0) {
    return emptyCanonicalGraph(profile, 'graph_store_empty_repair_required');
  }

  if (edges.length === 0) {
    return {
      profile,
      sourceState: 'degraded',
      degradedReason: 'graph_edges_empty_repair_required',
      nodes,
      edges: [],
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
