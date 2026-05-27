import {
  canonicalGraphEdge,
  canonicalGraphNode,
  graphEdgeJsonSchema,
  graphNodeJsonSchema,
  isGraphProfile,
  type CanonicalGraphEdge,
  type CanonicalGraphNode,
  type CanonicalGraphState,
  type GraphProfile,
} from '../../../packages/graph/src';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type Row = Record<string, unknown>;

const fallbackNodes = [
  ['sfi.core', 'SFI_CORE', 'institutional', 0.5, 0.43, 1, 'institutional'],
  ['sfi.ihg_basal', 'IHG_BASAL', 'field_metric', 0.42, 0.41, 1, 'active'],
  ['sfi.nti_obs', 'NTI_OBS', 'field_metric', 0.58, 0.37, 0.85, 'active'],
  ['sfi.friccion_sem', 'FRICCION_SEM', 'field_metric', 0.68, 0.56, 0.75, 'active'],
  ['sfi.perturbacion', 'PERTURBACION', 'field_metric', 0.28, 0.57, 0.7, 'active'],
  ['sfi.nod_decision', 'NOD_DECISION', 'field_metric', 0.73, 0.31, 0.65, 'active'],
  ['sfi.disipacion', 'DISIPACION', 'field_metric', 0.47, 0.68, 0.8, 'active'],
  ['sfi.campo_lat', 'CAMPO_LAT', 'field_metric', 0.82, 0.62, 0.58, 'active'],
  ['sfi.vec_div', 'VEC_DIV', 'field_metric', 0.22, 0.33, 0.55, 'active'],
  ['sfi.ldi_t', 'LDI_T', 'persistent_metric', 0.5, 0.53, 0.88, 'persistent'],
  ['sfi.coh_hist', 'COH_HIST', 'persistent_metric', 0.32, 0.74, 0.7, 'persistent'],
  ['sfi.mem_estruc', 'MEM_ESTRUC', 'persistent_metric', 0.62, 0.76, 0.65, 'persistent'],
  ['sfi.reg_ent', 'REG_ENT', 'persistent_metric', 0.14, 0.51, 0.75, 'persistent'],
  ['sfi.estab_res', 'ESTAB_RES', 'persistent_metric', 0.87, 0.44, 0.58, 'persistent'],
  ['sfi.pat_recur', 'PAT_RECUR', 'persistent_metric', 0.4, 0.25, 0.55, 'persistent'],
  ['sfi.traz_pasiva', 'TRAZ_PASIVA', 'persistent_metric', 0.71, 0.83, 0.5, 'persistent'],
  ['sfi.snl_aten', 'SNL_ATEN', 'persistent_metric', 0.24, 0.84, 0.45, 'persistent'],
  ['sfi.anomalia_01', 'ANOMALIA_01', 'anomaly', 0.5, 0.19, 0.78, 'anomaly'],
  ['sfi.trans_critica', 'TRANS_CRITICA', 'anomaly', 0.79, 0.51, 0.73, 'anomaly'],
  ['sfi.bifurcacion', 'BIFURCACION', 'anomaly', 0.2, 0.19, 0.68, 'anomaly'],
  ['sfi.evento_sing', 'EVENTO_SING', 'anomaly', 0.89, 0.79, 0.63, 'anomaly'],
  ['sfi.eps_a', 'EPS_A', 'opaque', 0.1, 0.67, 0.48, 'opaque'],
  ['sfi.eps_b', 'EPS_B', 'opaque', 0.91, 0.23, 0.43, 'opaque'],
  ['sfi.eps_c', 'EPS_C', 'opaque', 0.56, 0.91, 0.38, 'opaque'],
  ['sfi.eps_d', 'EPS_D', 'opaque', 0.07, 0.35, 0.33, 'opaque'],
  ['sfi.eps_e', 'EPS_E', 'opaque', 0.76, 0.13, 0.28, 'opaque'],
  ['sfi.inegi_ee3', 'INEGI_EE3', 'institutional', 0.35, 0.47, 0.8, 'institutional'],
  ['sfi.cimps_2026', 'CIMPS_2026', 'institutional', 0.63, 0.43, 0.68, 'institutional'],
  ['sfi.unipres_pil', 'UNIPRES_PIL', 'institutional', 0.42, 0.6, 0.73, 'institutional'],
  ['sfi.atlas_proto', 'ATLAS_PROTO', 'institutional', 0.58, 0.61, 0.78, 'institutional'],
] as const;

const fallbackEdges = [
  ['sfi.core', 'sfi.ihg_basal', 'structural'],
  ['sfi.core', 'sfi.nti_obs', 'structural'],
  ['sfi.core', 'sfi.ldi_t', 'structural'],
  ['sfi.core', 'sfi.disipacion', 'structural'],
  ['sfi.core', 'sfi.inegi_ee3', 'structural'],
  ['sfi.core', 'sfi.atlas_proto', 'structural'],
  ['sfi.core', 'sfi.cimps_2026', 'structural'],
  ['sfi.ihg_basal', 'sfi.nti_obs', 'structural'],
  ['sfi.ihg_basal', 'sfi.perturbacion', 'structural'],
  ['sfi.nti_obs', 'sfi.cimps_2026', 'structural'],
  ['sfi.disipacion', 'sfi.unipres_pil', 'structural'],
  ['sfi.ldi_t', 'sfi.reg_ent', 'structural'],
  ['sfi.vec_div', 'sfi.bifurcacion', 'latent'],
  ['sfi.vec_div', 'sfi.pat_recur', 'latent'],
  ['sfi.perturbacion', 'sfi.reg_ent', 'latent'],
  ['sfi.friccion_sem', 'sfi.trans_critica', 'latent'],
  ['sfi.campo_lat', 'sfi.trans_critica', 'latent'],
  ['sfi.mem_estruc', 'sfi.traz_pasiva', 'latent'],
  ['sfi.pat_recur', 'sfi.anomalia_01', 'latent'],
  ['sfi.eps_a', 'sfi.perturbacion', 'latent'],
  ['sfi.ihg_basal', 'sfi.ldi_t', 'resonance'],
  ['sfi.nti_obs', 'sfi.friccion_sem', 'resonance'],
  ['sfi.cimps_2026', 'sfi.friccion_sem', 'resonance'],
  ['sfi.anomalia_01', 'sfi.nti_obs', 'resonance'],
  ['sfi.trans_critica', 'sfi.estab_res', 'resonance'],
  ['sfi.atlas_proto', 'sfi.mem_estruc', 'resonance'],
  ['sfi.core', 'sfi.unipres_pil', 'resonance'],
] as const;

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

export function defaultCanonicalGraph(profile: GraphProfile, reason: string): CanonicalGraphState {
  const loadedAt = now();
  const nodes = fallbackNodes
    .filter((node) => profile === 'shared' || node[0].startsWith(`${profile}.`) || node[0].startsWith('sfi.'))
    .map((node): CanonicalGraphNode => ({
      ...canonicalGraphNode({
        nodeId: node[0],
        label: node[1],
        ontologyType: node[2],
        profile: 'sfi',
        origin: 'legacy_canvas_topology',
        provenance: 'src.observatory.components.field.SfiCognitiveCanvasTerminal',
        lineage: ['MACROPHASE_B_BOOTSTRAP_GRAPH'],
        attributes: {
          profile: 'sfi',
          rx: node[3],
          ry: node[4],
          weight: node[5],
          canvasKind: node[6],
        },
        createdAt: loadedAt,
        updatedAt: loadedAt,
      }),
      profile: 'sfi',
      origin: 'legacy_canvas_topology',
      provenance: 'src.observatory.components.field.SfiCognitiveCanvasTerminal',
      attributes: {
        profile: 'sfi',
        rx: node[3],
        ry: node[4],
        weight: node[5],
        canvasKind: node[6],
      },
    }));
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const edges = reason === 'graph_edges_empty'
    ? []
    : fallbackEdges
      .filter((edge) => nodeIds.has(edge[0]) && nodeIds.has(edge[1]))
      .map((edge): CanonicalGraphEdge => ({
        ...canonicalGraphEdge({
          edgeId: `${edge[0]}:${edge[1]}:${edge[2]}`,
          sourceNodeId: edge[0],
          targetNodeId: edge[1],
          relation: edge[2],
          weight: edge[2] === 'structural' ? 0.9 : edge[2] === 'resonance' ? 0.68 : 0.45,
          profile: 'sfi',
          origin: 'legacy_canvas_topology',
          provenance: 'src.observatory.components.field.SfiCognitiveCanvasTerminal',
          lineage: ['MACROPHASE_B_BOOTSTRAP_GRAPH'],
          attributes: { profile: 'sfi', canvasKind: edge[2] },
          createdAt: loadedAt,
          updatedAt: loadedAt,
        }),
        profile: 'sfi',
        origin: 'legacy_canvas_topology',
        provenance: 'src.observatory.components.field.SfiCognitiveCanvasTerminal',
        attributes: { profile: 'sfi', canvasKind: edge[2] },
      }));

  return {
    profile,
    sourceState: 'degraded',
    degradedReason: reason,
    nodes,
    edges,
    schemas: { node: graphNodeJsonSchema, edge: graphEdgeJsonSchema },
    loadedAt,
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
  const relation = stringValue(row.relation, row.edge_type, row.type) ?? 'related_to';
  const rawSourceNodeId = stringValue(row.source_node_id, row.source_id, row.from_node_id, row.from_id, row.source, row.from);
  const rawTargetNodeId = stringValue(row.target_node_id, row.target_id, row.to_node_id, row.to_id, row.target, row.to);
  const sourceNodeId = rawSourceNodeId ? nodeIdByStoredId.get(rawSourceNodeId) ?? rawSourceNodeId : '';
  const targetNodeId = rawTargetNodeId ? nodeIdByStoredId.get(rawTargetNodeId) ?? rawTargetNodeId : '';

  return {
    edgeId: stringValue(row.edge_id, row.edge_key, row.key, row.id) ?? `${sourceNodeId}:${targetNodeId}:${relation}`,
    sourceNodeId,
    targetNodeId,
    relation,
    weight: Math.max(0, Math.min(1, Number(row.weight ?? 0))),
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
    return defaultCanonicalGraph(profile, error instanceof Error ? error.message : 'graph_store_unavailable');
  }

  const [nodesResult, edgesResult] = await Promise.all([
    service.from('graph_nodes').select('*').order('created_at', { ascending: true }),
    service.from('graph_edges').select('*').order('created_at', { ascending: true }),
  ]);

  if (nodesResult.error || edgesResult.error) {
    return defaultCanonicalGraph(profile, nodesResult.error?.message ?? edgesResult.error?.message ?? 'graph_store_read_failed');
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
    return defaultCanonicalGraph(profile, 'graph_store_empty');
  }

  if (edges.length === 0) {
    return defaultCanonicalGraph(profile, 'graph_edges_empty');
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
